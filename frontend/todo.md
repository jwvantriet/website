# Admin Vacancy Enhancement & Carerix Write-Back

## Tasks

1. **Backend: Carerix Write-Back Service** (`backend/services/carerix_writer.py`)
   - GraphQL mutation to update publication content on Carerix
   - Uses existing OAuth2 token from vacancies service
   - Updates intro, vacancy, requirements, offer, company HTML fields

2. **Backend: Admin Enhance + Push Endpoint** (`backend/routers/vacancies.py`)
   - POST `/api/v1/vacancies/admin/enhance-and-push/{vacancy_id}` 
   - Requires auth (admin only)
   - Fetches raw vacancy → AI enhance → push to Carerix → return result
   - Also add GET `/api/v1/vacancies/admin/list` for admin vacancy list with enhancement status

3. **Frontend: Admin Vacancies Dashboard** (`pages/AdminVacancies.tsx`)
   - Protected behind login via ProtectedAdminRoute
   - Lists all vacancies with title, industry, location, status
   - "Enhance with AI" button per vacancy
   - Shows before/after preview in a dialog
   - "Push to Carerix" button to confirm and send back
   - Status indicators (enhanced/not enhanced/pushing)

4. **Frontend: Update App.tsx**
   - Add `/admin/vacancies` route wrapped in AuthProvider + ProtectedAdminRoute
   - Import AdminVacancies page

5. **Frontend: Remove AI badge from public VacancyDetail**
   - Remove the "AI Enhanced" and "Enhancing..." badges
   - Remove the background AI enhancement fetch
   - Just show raw vacancy data on the public page

6. **Lint & Build check**

## Files to Create/Modify
- CREATE: `backend/services/carerix_writer.py`
- MODIFY: `backend/routers/vacancies.py` (add admin endpoints)
- CREATE: `frontend/src/pages/AdminVacancies.tsx`
- MODIFY: `frontend/src/App.tsx` (add admin route)
- MODIFY: `frontend/src/pages/VacancyDetail.tsx` (remove AI badge + auto-enhance)