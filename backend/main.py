from typing import Dict, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


class Shipment(BaseModel):
    id: str
    type: str = Field(pattern="^(medical|food)$")
    eta: int = Field(ge=1, description="ETA in hours")
    risk: int = Field(ge=0, le=100)
    impact: Optional[str] = None


def impact_for_type(shipment_type: str) -> str:
    return "120 patients at risk" if shipment_type == "medical" else "500 people affected"


def response_payload(message: str, shipment: Shipment) -> Dict[str, object]:
    return {
        "status": "success",
        "message": message,
        "shipment": shipment.model_dump(),
    }


app = FastAPI(title="SupplyShield AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

shipment_state = Shipment(
    id="SHIP-1001",
    type="medical",
    eta=10,
    risk=20,
    impact=None,
)


@app.get("/")
def health_check() -> Dict[str, str]:
    return {"message": "API working"}


@app.get("/shipment")
def get_shipment() -> Dict[str, object]:
    return response_payload("Shipment fetched successfully.", shipment_state)


@app.post("/simulate")
def simulate_disruption() -> Dict[str, object]:
    shipment_state.risk = min(100, shipment_state.risk + 50)
    shipment_state.eta += 4
    shipment_state.impact = impact_for_type(shipment_state.type)
    return response_payload("Disruption simulated successfully.", shipment_state)


@app.get("/reroute")
def reroute_shipment() -> Dict[str, object]:
    shipment_state.eta = max(1, shipment_state.eta - 3)
    shipment_state.risk = max(0, shipment_state.risk - 35)
    shipment_state.impact = "Rerouted: impact reduced and delivery stabilized."
    return response_payload("Reroute applied successfully.", shipment_state)
