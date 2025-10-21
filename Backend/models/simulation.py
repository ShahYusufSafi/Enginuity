from pydantic import BaseModel

class SimulationRequest(BaseModel):
    domain: list[float | int]
    num_elements: int
