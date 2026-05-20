"""
Schema Audit Tests

Verifies the database schema design decisions:
1. Which entities have "additional_information" fields (answer: only crx_vacancies)
2. All entities use "raw_json" for storing full Carerix responses
3. No entity has "additionalinfo" (camelCase or concatenated) fields
4. Platform users table has correct structure
"""

import json
import os
import pytest


DATA_MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data_models")


def load_all_schemas():
    """Load all JSON schema files from data_models/."""
    schemas = {}
    for filename in os.listdir(DATA_MODELS_DIR):
        if filename.endswith(".json"):
            filepath = os.path.join(DATA_MODELS_DIR, filename)
            with open(filepath, "r") as f:
                schemas[filename.replace(".json", "")] = json.load(f)
    return schemas


class TestSchemaAudit:
    """Audit all entity schemas for field consistency."""

    def test_only_vacancies_have_additional_information(self):
        """Only crx_vacancies should have an 'additional_information' field."""
        schemas = load_all_schemas()
        entities_with_additional_info = []

        for entity_name, schema in schemas.items():
            props = schema.get("properties", {})
            if "additional_information" in props:
                entities_with_additional_info.append(entity_name)

        assert entities_with_additional_info == ["crx_vacancies"], (
            f"Expected only crx_vacancies to have additional_information, "
            f"but found: {entities_with_additional_info}"
        )
        print(f"  ✓ Only crx_vacancies has additional_information field")

    def test_no_entity_has_additionalinfo_concatenated(self):
        """No entity should have 'additionalinfo' (no underscore) field."""
        schemas = load_all_schemas()
        violations = []

        for entity_name, schema in schemas.items():
            props = schema.get("properties", {})
            for field_name in props:
                if field_name.lower() == "additionalinfo":
                    violations.append(f"{entity_name}.{field_name}")

        assert violations == [], (
            f"Found unexpected 'additionalinfo' fields: {violations}"
        )
        print("  ✓ No entity has 'additionalinfo' (concatenated) field")

    def test_no_entity_has_additional_info_snake(self):
        """Check for 'additional_info' (different from 'additional_information')."""
        schemas = load_all_schemas()
        violations = []

        for entity_name, schema in schemas.items():
            props = schema.get("properties", {})
            if "additional_info" in props:
                violations.append(entity_name)

        assert violations == [], (
            f"Found unexpected 'additional_info' fields on: {violations}"
        )
        print("  ✓ No entity has 'additional_info' field")

    def test_all_carerix_entities_have_raw_json(self):
        """All Carerix-synced entities should have raw_json for storing full responses."""
        schemas = load_all_schemas()
        carerix_entities = [
            "employees", "crx_jobs", "crx_vacancies", "crx_matches",
            "crx_publications", "crx_todos", "companies",
        ]
        missing_raw_json = []

        for entity_name in carerix_entities:
            if entity_name in schemas:
                props = schemas[entity_name].get("properties", {})
                if "raw_json" not in props:
                    missing_raw_json.append(entity_name)

        assert missing_raw_json == [], (
            f"Carerix entities missing raw_json field: {missing_raw_json}"
        )
        print(f"  ✓ All {len(carerix_entities)} Carerix entities have raw_json field")

    def test_all_carerix_entities_have_carerix_id(self):
        """All Carerix-synced entities should have carerix_id."""
        schemas = load_all_schemas()
        carerix_entities = [
            "employees", "crx_jobs", "crx_vacancies", "crx_matches",
            "crx_publications", "crx_todos", "companies",
        ]
        missing = []

        for entity_name in carerix_entities:
            if entity_name in schemas:
                props = schemas[entity_name].get("properties", {})
                if "carerix_id" not in props:
                    missing.append(entity_name)

        assert missing == [], (
            f"Carerix entities missing carerix_id: {missing}"
        )
        print(f"  ✓ All Carerix entities have carerix_id field")

    def test_employees_has_no_additional_fields(self):
        """Employees specifically should NOT have additional_information."""
        schemas = load_all_schemas()
        emp_props = schemas["employees"]["properties"]
        assert "additional_information" not in emp_props
        assert "additionalinfo" not in emp_props
        assert "additional_info" not in emp_props
        print("  ✓ Employees confirmed: no additional info fields")
        print(f"    Employee fields count: {len(emp_props)}")

    def test_jobs_has_no_additional_fields(self):
        """Jobs specifically should NOT have additional_information."""
        schemas = load_all_schemas()
        job_props = schemas["crx_jobs"]["properties"]
        assert "additional_information" not in job_props
        assert "additionalinfo" not in job_props
        assert "additional_info" not in job_props
        print("  ✓ Jobs confirmed: no additional info fields")
        print(f"    Job fields count: {len(job_props)}")

    def test_platform_users_structure(self):
        """Platform users should have the expected authentication fields."""
        schemas = load_all_schemas()
        pu_props = schemas["platform_users"]["properties"]

        required_fields = [
            "id", "auth_source", "role", "carerix_id", "company_id",
            "placement_id", "email", "name", "password_hash", "is_active",
            "last_login", "created_at", "updated_at",
        ]

        for field in required_fields:
            assert field in pu_props, f"platform_users missing field: {field}"

        # Platform users should NOT have additional info fields
        assert "additional_information" not in pu_props
        assert "raw_json" not in pu_props  # Not a Carerix entity
        print(f"  ✓ Platform users has all {len(required_fields)} required fields")

    def test_print_field_summary(self):
        """Print a summary of all entities and their field counts."""
        schemas = load_all_schemas()
        print("\n  ═══ Entity Field Summary ═══")
        for entity_name in sorted(schemas.keys()):
            props = schemas[entity_name].get("properties", {})
            has_additional = "additional_information" in props
            has_raw_json = "raw_json" in props
            flags = []
            if has_additional:
                flags.append("has additional_information")
            if has_raw_json:
                flags.append("has raw_json")
            flag_str = f" [{', '.join(flags)}]" if flags else ""
            print(f"    {entity_name}: {len(props)} fields{flag_str}")
        print("  ═══════════════════════════")