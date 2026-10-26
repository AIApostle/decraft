import uvicorn

from backend.application import create_app


def main() -> None:
    uvicorn.run(create_app(), host="127.0.0.1", port=8000)
