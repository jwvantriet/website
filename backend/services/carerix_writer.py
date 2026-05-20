"""
Carerix Writer — Pushes AI-enhanced vacancy content back to Carerix via GraphQL mutation.

Uses the same OAuth2 credentials and token caching as the vacancies service.

Confirmed mutation names from Carerix support:
- crPublicationUpdate — update a publication
- crPublicationCreate — create a publication
- crVacancyUpdate — update a vacancy
- crVacancyCreate — create a vacancy

Strategy:
1. Introspect the schema to discover the exact argument format
2. Introspect the input type (e.g. CRPublicationRequest) to discover accepted fields
3. Try crPublicationUpdate with the discovered argument format
4. Fall back to crVacancyUpdate if publication update fails
"""

import json
import logging
from typing import Optional

import httpx

from services.carerix_auth import _get_access_token, CARERIX_GRAPHQL_URL

logger = logging.getLogger(__name__)

# Carerix GraphQL field mapping — our keys → Carerix publication field names
PUBLICATION_FIELD_MAPPING = {
    "intro_html": "introInformationHTML",
    "vacancy_html": "vacancyInformationHTML",
    "requirements_html": "requirementsInformationHTML",
    "offer_html": "offerInformationHTML",
    "company_html": "companyInformationHTML",
}

# Known Carerix mutation names (confirmed by Carerix support)
PRIMARY_MUTATION = "crPublicationUpdate"
FALLBACK_MUTATIONS = [
    "crVacancyUpdate",
]

# Carerix requires a `_kind` field in the input object for mutations.
# This maps mutation names to the entity _kind value.
MUTATION_KIND_MAP = {
    "crPublicationUpdate": "CRPublication",
    "crPublicationCreate": "CRPublication",
    "crVacancyUpdate": "CRVacancy",
    "crVacancyCreate": "CRVacancy",
}

# Cache for discovered schema info
_schema_cache: dict = {
    "mutations": None,
    "mutation_details": None,
    "input_types": {},
}


def clear_schema_cache():
    """Clear the schema cache to force re-introspection."""
    _schema_cache["mutations"] = None
    _schema_cache["mutation_details"] = None
    _schema_cache["input_types"] = {}


async def _introspect_schema(token: str) -> dict:
    """Introspect the Carerix GraphQL schema to discover available mutations."""
    global _schema_cache

    if _schema_cache["mutations"] is not None:
        return _schema_cache

    # Use deeper introspection to handle NON_NULL wrappers
    introspection_query = """
    {
      __schema {
        mutationType {
          name
          fields {
            name
            args {
              name
              type {
                name
                kind
                ofType {
                  name
                  kind
                  ofType {
                    name
                    kind
                  }
                }
              }
            }
          }
        }
      }
    }
    """

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.post(
                CARERIX_GRAPHQL_URL,
                json={"query": introspection_query},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )

            if response.status_code != 200:
                logger.error("Schema introspection HTTP %d: %s", response.status_code, response.text[:500])
                _schema_cache["mutations"] = []
                return _schema_cache

            result = response.json()
            if "errors" in result:
                logger.error("Schema introspection errors: %s", result["errors"][:3])
                _schema_cache["mutations"] = []
                return _schema_cache

            mutation_type = result.get("data", {}).get("__schema", {}).get("mutationType")
            if not mutation_type:
                logger.warning("No mutation type found in Carerix schema")
                _schema_cache["mutations"] = []
                return _schema_cache

            fields = mutation_type.get("fields", [])
            _schema_cache["mutations"] = [f["name"] for f in fields]
            _schema_cache["mutation_details"] = {f["name"]: f for f in fields}

            logger.info(
                "Schema introspection: %d mutations total. Publication-related: %s",
                len(fields),
                [f["name"] for f in fields if "publication" in f["name"].lower() or "vacancy" in f["name"].lower()],
            )

    except Exception as e:
        logger.error("Schema introspection failed: %s", e)
        _schema_cache["mutations"] = []

    return _schema_cache


def _unwrap_type(type_info: dict) -> tuple[str, str]:
    """
    Unwrap a GraphQL type through NON_NULL / LIST wrappers to get the base type.
    Returns (type_name, type_kind) of the innermost type.
    """
    if not type_info:
        return ("", "")

    kind = type_info.get("kind", "")
    name = type_info.get("name") or ""

    # If it's a wrapper type (NON_NULL, LIST), unwrap
    if kind in ("NON_NULL", "LIST") and not name:
        of_type = type_info.get("ofType") or {}
        return _unwrap_type(of_type)

    return (name, kind)


async def _introspect_input_type(token: str, type_name: str) -> list[dict]:
    """Get fields of a specific input type."""
    if type_name in _schema_cache.get("input_types", {}):
        return _schema_cache["input_types"][type_name]

    query = """
    {
      __type(name: "%s") {
        name
        inputFields {
          name
          type {
            name
            kind
            ofType { name kind }
          }
        }
      }
    }
    """ % type_name

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.post(
                CARERIX_GRAPHQL_URL,
                json={"query": query},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            if response.status_code == 200:
                result = response.json()
                type_info = result.get("data", {}).get("__type") or {}
                fields = type_info.get("inputFields", [])
                _schema_cache.setdefault("input_types", {})[type_name] = fields
                logger.info("Input type %s has %d fields: %s", type_name, len(fields), [f["name"] for f in fields])
                return fields
    except Exception as e:
        logger.error("Input type introspection failed for %s: %s", type_name, e)

    return []


async def _get_mutation_arg_info(token: str, mutation_name: str) -> dict:
    """Get argument info for a specific mutation, unwrapping NON_NULL wrappers."""
    schema = await _introspect_schema(token)
    details = (schema.get("mutation_details") or {}).get(mutation_name)
    if not details:
        return {"exists": False, "args": []}

    args = details.get("args", [])
    arg_info = {"exists": True, "args": []}

    for arg in args:
        raw_type = arg.get("type", {})
        type_name, type_kind = _unwrap_type(raw_type)

        entry = {
            "name": arg["name"],
            "type_name": type_name,
            "type_kind": type_kind,
            "raw_kind": raw_type.get("kind", ""),
            "input_fields": [],
        }

        # If it's an INPUT_OBJECT, introspect its fields
        if type_kind == "INPUT_OBJECT" and type_name:
            input_fields = await _introspect_input_type(token, type_name)
            entry["input_fields"] = [f["name"] for f in input_fields]

        arg_info["args"].append(entry)

    return arg_info


async def get_schema_info() -> dict:
    """Public function to get schema info for the debug endpoint."""
    token = await _get_access_token()
    if not token:
        return {"error": "Failed to obtain access token"}

    schema = await _introspect_schema(token)

    all_mutations = schema.get("mutations") or []
    pub_mutations = [m for m in all_mutations if "publication" in m.lower()]
    vacancy_mutations = [m for m in all_mutations if "vacancy" in m.lower()]

    result = {
        "total_mutations": len(all_mutations),
        "all_mutations": all_mutations,
        "publication_related": pub_mutations,
        "vacancy_related": vacancy_mutations,
        "primary_mutation": PRIMARY_MUTATION,
        "primary_mutation_exists": PRIMARY_MUTATION in all_mutations,
    }

    # Get detailed arg info for key mutations
    for mutation_name in [PRIMARY_MUTATION, "crVacancyUpdate", "crPublicationCreate", "crVacancyCreate"]:
        if mutation_name in all_mutations:
            arg_info = await _get_mutation_arg_info(token, mutation_name)
            result[f"args_{mutation_name}"] = arg_info

    return result


async def _execute_graphql(token: str, query: str, variables: dict = None) -> dict:
    """Execute a GraphQL query/mutation and return the parsed response."""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.post(
                CARERIX_GRAPHQL_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )

            logger.info(
                "GraphQL response: HTTP %d, body: %s",
                response.status_code,
                response.text[:1000],
            )

            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"HTTP {response.status_code}: {response.text[:300]}",
                }

            result = response.json()

            if "errors" in result:
                error_msgs = [e.get("message", str(e)) for e in result["errors"][:3]]
                return {
                    "success": False,
                    "error": "; ".join(error_msgs),
                    "graphql_errors": result["errors"][:3],
                }

            return {"success": True, "data": result.get("data", {})}

    except Exception as e:
        return {"success": False, "error": str(e)}


async def _try_mutation(
    token: str,
    mutation_name: str,
    publication_id: str,
    carerix_fields: dict,
) -> dict:
    """
    Try a mutation by first introspecting its arguments to determine the correct format.

    Carerix mutations typically have this signature:
        crPublicationUpdate(_id: ID!, language: Language, request: CRPublicationRequest!): CRPublication

    So we need to:
    1. Find the ID arg (named _id, id, publicationID, etc.)
    2. Find the INPUT_OBJECT arg (named request, input, data, etc.)
    3. Optionally include the language ENUM arg
    4. Build the mutation with proper GraphQL variables
    """
    arg_info = await _get_mutation_arg_info(token, mutation_name)

    if not arg_info["exists"]:
        return {"success": False, "error": f"Mutation {mutation_name} not found in schema"}

    args = arg_info["args"]

    logger.info(
        "Mutation %s args (unwrapped): %s",
        mutation_name,
        [(a["name"], a["type_name"], a["type_kind"], a["raw_kind"]) for a in args],
    )

    # Classify arguments
    id_arg = None
    input_arg = None
    enum_args = []

    for a in args:
        name = a["name"]
        type_kind = a["type_kind"]
        type_name = a["type_name"]

        # ID argument: named _id, id, publicationID, vacancyID, or type is ID/Int/String scalar
        if name in ("_id", "id", "publicationID", "vacancyID"):
            id_arg = a
        elif type_kind == "INPUT_OBJECT":
            input_arg = a
        elif type_kind == "ENUM":
            enum_args.append(a)
        elif type_kind == "SCALAR" and type_name in ("ID", "Int", "String") and id_arg is None:
            # Fallback: treat first scalar ID/Int/String as the ID arg
            id_arg = a

    if not id_arg:
        return {
            "success": False,
            "error": f"Could not find ID argument for {mutation_name}. Args: {[a['name'] for a in args]}",
        }

    if not input_arg:
        return {
            "success": False,
            "error": f"Could not find INPUT_OBJECT argument for {mutation_name}. Args: {[(a['name'], a['type_kind']) for a in args]}",
        }

    # Filter carerix_fields to only include fields that exist in the input type
    valid_field_names = set(input_arg.get("input_fields", []))
    if valid_field_names:
        filtered_fields = {k: v for k, v in carerix_fields.items() if k in valid_field_names}
        skipped = set(carerix_fields.keys()) - set(filtered_fields.keys())
        if skipped:
            logger.warning(
                "Skipped fields not in %s: %s. Valid fields: %s",
                input_arg["type_name"],
                skipped,
                sorted(valid_field_names),
            )
        if not filtered_fields:
            # If filtering removed everything, the input type doesn't have our fields
            return {
                "success": False,
                "error": (
                    f"None of our fields ({list(carerix_fields.keys())}) exist in "
                    f"{input_arg['type_name']}. Valid fields: {sorted(valid_field_names)}"
                ),
            }
    else:
        # No field info available, try with all fields
        filtered_fields = carerix_fields
        logger.warning("No field info for %s, trying with all fields", input_arg["type_name"])

    # Carerix requires `_kind` in the input object for mutations.
    # Inject it automatically if the input type has a `_kind` field.
    if "_kind" in valid_field_names and "_kind" not in filtered_fields:
        kind_value = MUTATION_KIND_MAP.get(mutation_name)
        if kind_value:
            filtered_fields["_kind"] = kind_value
            logger.info("Injected _kind='%s' into input for %s", kind_value, mutation_name)
        else:
            logger.warning(
                "Input type %s requires _kind but no mapping found for mutation %s",
                input_arg["type_name"],
                mutation_name,
            )

    logger.info(
        "Building mutation: %s(%s: $id, %s: $input) with %d fields: %s",
        mutation_name,
        id_arg["name"],
        input_arg["name"],
        len(filtered_fields),
        list(filtered_fields.keys()),
    )

    # Determine the ID type for the variable declaration
    id_type = id_arg["type_name"] or "ID"
    # If the original arg was NON_NULL, add !
    id_type_decl = f"{id_type}!" if id_arg["raw_kind"] == "NON_NULL" else id_type

    input_type = input_arg["type_name"]
    input_type_decl = f"{input_type}!" if input_arg["raw_kind"] == "NON_NULL" else input_type

    # Build variable declarations and argument list
    var_decls = [f"$id: {id_type_decl}", f"$input: {input_type_decl}"]
    arg_parts = [f'{id_arg["name"]}: $id', f'{input_arg["name"]}: $input']

    variables = {
        "id": publication_id,
        "input": filtered_fields,
    }

    # Language enum is optional in Carerix — skip it to avoid invalid enum value errors.
    # The API will use the default language if not specified.

    var_decl_str = ", ".join(var_decls)
    arg_str = ", ".join(arg_parts)

    # Build return fields — try common Carerix publication fields
    return_fields = "publicationID modificationDate titleInformation"

    mutation_str = f"""
    mutation UpdateContent({var_decl_str}) {{
      {mutation_name}({arg_str}) {{
        {return_fields}
      }}
    }}
    """

    logger.info("Executing mutation:\n%s\nVariables: %s", mutation_str.strip(), json.dumps(variables, indent=2)[:500])

    result = await _execute_graphql(token, mutation_str, variables)

    if result.get("success"):
        data = result.get("data", {}).get(mutation_name)
        if data:
            return {
                "success": True,
                "publication_id": data.get("publicationID", ""),
                "mutation_used": mutation_name,
                "carerix_response": data,
            }
        # Data key exists but mutation returned null — might still be success
        return {
            "success": True,
            "publication_id": publication_id,
            "mutation_used": mutation_name,
            "carerix_response": result.get("data"),
            "note": "Mutation returned null data — update may have succeeded",
        }

    # If we got GraphQL errors, check if it's a field-related error and retry without return fields
    graphql_errors = result.get("graphql_errors", [])
    error_text = result.get("error", "")

    if any("field" in str(e).lower() or "cannot query" in str(e).lower() for e in graphql_errors):
        logger.info("Retrying mutation without return fields due to field errors")
        # Retry with minimal return fields
        mutation_str_minimal = f"""
        mutation UpdateContent({var_decl_str}) {{
          {mutation_name}({arg_str}) {{
            publicationID
          }}
        }}
        """
        result2 = await _execute_graphql(token, mutation_str_minimal, variables)
        if result2.get("success"):
            data2 = result2.get("data", {}).get(mutation_name)
            return {
                "success": True,
                "publication_id": (data2 or {}).get("publicationID", publication_id),
                "mutation_used": mutation_name,
                "carerix_response": data2,
            }
        # Return the original error if retry also failed
        return {
            "success": False,
            "error": result.get("error", "Unknown error"),
            "retry_error": result2.get("error"),
        }

    return {
        "success": False,
        "error": error_text,
        "graphql_errors": graphql_errors,
    }


async def push_to_carerix(publication_id: str, enhanced_vacancy: dict) -> dict:
    """
    Push AI-enhanced vacancy content back to Carerix.

    Uses crPublicationUpdate as the primary mutation (confirmed by Carerix support).
    Falls back to crVacancyUpdate if publication update fails.

    Returns dict with success status and details.
    """
    token = await _get_access_token()
    if not token:
        return {"success": False, "error": "Failed to obtain Carerix access token"}

    # Extract and map fields to push
    carerix_fields = {}
    for our_key, carerix_key in PUBLICATION_FIELD_MAPPING.items():
        val = enhanced_vacancy.get(our_key, "")
        if val:
            carerix_fields[carerix_key] = val

    if not carerix_fields:
        return {"success": False, "error": "No content fields to update"}

    logger.info(
        "Pushing to Carerix publication %s with fields: %s",
        publication_id,
        list(carerix_fields.keys()),
    )

    # Ensure schema is loaded
    await _introspect_schema(token)
    all_mutations = _schema_cache.get("mutations") or []

    errors = {}

    # Try mutations in priority order
    mutations_to_try = [PRIMARY_MUTATION] + FALLBACK_MUTATIONS

    for mutation_name in mutations_to_try:
        if mutation_name not in all_mutations:
            logger.debug("Skipping %s — not in schema", mutation_name)
            errors[mutation_name] = "Not found in schema"
            continue

        logger.info("Trying mutation: %s", mutation_name)
        result = await _try_mutation(token, mutation_name, publication_id, carerix_fields)
        if result.get("success"):
            logger.info("Successfully pushed via %s", mutation_name)
            return result
        errors[mutation_name] = result.get("error", "unknown")
        logger.warning("Mutation %s failed: %s", mutation_name, result.get("error"))

    # All failed — return detailed info
    pub_mutations = [m for m in all_mutations if "publication" in m.lower()]
    vacancy_mutations = [m for m in all_mutations if "vacancy" in m.lower()]

    return {
        "success": False,
        "error": (
            "Could not update the publication in Carerix. "
            "Tried mutations: " + ", ".join(mutations_to_try) + ". "
            "The API credentials may not have write permissions, or the mutation format may differ."
        ),
        "details": errors,
        "schema_info": {
            "available_publication_mutations": pub_mutations,
            "available_vacancy_mutations": vacancy_mutations,
            "all_mutation_count": len(all_mutations),
        },
    }