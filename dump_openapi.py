import json
import sys
import os

# Include backend in python path
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from main import app

openapi_schema = app.openapi()

with open("openapi.json", "w", encoding="utf-8") as f:
    json.dump(openapi_schema, f, indent=2)

print("OpenAPI schema successfully dumped to openapi.json!")
