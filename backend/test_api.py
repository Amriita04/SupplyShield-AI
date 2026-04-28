import importlib
import unittest

import main
from fastapi.testclient import TestClient


class SupplyShieldAPITestCase(unittest.TestCase):
    def setUp(self) -> None:
        importlib.reload(main)
        self.client = TestClient(main.app)

    def test_get_shipment_initial_state(self) -> None:
        response = self.client.get("/shipment")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["id"], "SHIP-1001")
        self.assertEqual(body["risk_level"], "Low")
        self.assertEqual(body["risk_score"], 20)
        self.assertEqual(body["eta_hours"], 10)

    def test_simulate_disruption(self) -> None:
        response = self.client.post("/simulate")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["risk_level"], "High")
        self.assertEqual(body["risk_score"], 85)
        self.assertEqual(body["eta_hours"], 14)
        self.assertEqual(body["impact_message"], "120 patients at risk")

    def test_reroute_after_simulation(self) -> None:
        self.client.post("/simulate")
        response = self.client.get("/reroute")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["route_name"], "Route B (Emergency Relief Corridor)")
        self.assertEqual(body["eta_hours"], 11)
        self.assertEqual(body["risk_level"], "Medium")
        self.assertEqual(body["risk_score"], 55)


if __name__ == "__main__":
    unittest.main()
