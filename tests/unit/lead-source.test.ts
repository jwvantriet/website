import { describe, expect, it } from 'vitest';
import { leadSourceFromForm } from '@/lib/lead-source';

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe('leadSourceFromForm', () => {
  it('keeps a known answer to "How did you find us?"', () => {
    expect(leadSourceFromForm(form({ heard_about: 'linkedin' }))).toEqual({ heard_about: 'linkedin' });
  });

  it('drops an answer that is not one of the options', () => {
    expect(leadSourceFromForm(form({ heard_about: 'drop table' }))).toEqual({});
    expect(leadSourceFromForm(form({ heard_about: '' }))).toEqual({});
  });

  it('keeps the page the form was sent from, without query string', () => {
    expect(leadSourceFromForm(form({ form_page: '/industries/aviation?utm_source=x' }))).toEqual({
      form_page: '/industries/aviation',
    });
  });

  it('refuses a form page that is not a path on this site', () => {
    expect(leadSourceFromForm(form({ form_page: 'https://evil.example/' }))).toEqual({});
    expect(leadSourceFromForm(form({ form_page: '//evil.example/x' }))).toEqual({});
  });

  it('keeps only host and path of the referrer, never its query string', () => {
    expect(
      leadSourceFromForm(form({ form_referrer: 'https://www.google.com/search?q=contract+pilots+for+airlines' })),
    ).toEqual({ form_referrer: 'www.google.com/search' });
    expect(leadSourceFromForm(form({ form_referrer: 'https://www.linkedin.com/' }))).toEqual({
      form_referrer: 'www.linkedin.com',
    });
  });

  it('drops a referrer that is not a web address', () => {
    expect(leadSourceFromForm(form({ form_referrer: 'javascript:alert(1)' }))).toEqual({});
    expect(leadSourceFromForm(form({ form_referrer: 'not a url' }))).toEqual({});
  });

  it('records nothing when the form sends nothing', () => {
    expect(leadSourceFromForm(form({}))).toEqual({});
  });
});
