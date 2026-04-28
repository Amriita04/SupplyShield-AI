const { useEffect, useRef, useState } = React;

const API_BASE = "http://127.0.0.1:8000";

function riskClass(level) {
  if (level >= 70) return "risk risk-high";
  if (level >= 40) return "risk risk-medium";
  return "risk risk-low";
}

function riskLabel(level) {
  if (level >= 70) return "High";
  if (level >= 40) return "Medium";
  return "Low";
}

function deltaClass(value) {
  if (value > 0) return "delta delta-up";
  if (value < 0) return "delta delta-down";
  return "delta delta-neutral";
}

function deltaText(value) {
  if (value === 0) return "No change";
  return `${value > 0 ? "+" : ""}${value} vs start`;
}

function App() {
  const [shipment, setShipment] = useState(null);
  const [initialShipment, setInitialShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Loading shipment...");
  const [actionMessage, setActionMessage] = useState("");
  const [error, setError] = useState("");
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  async function requestApi(endpoint, method = "GET") {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
    });

    let payload = null;
    try {
      payload = await res.json();
    } catch (_err) {
      payload = null;
    }

    if (!res.ok) {
      const message = payload?.message || `API error: ${res.status}`;
      throw new Error(message);
    }
    if (!payload?.shipment) throw new Error("Invalid response from server.");
    return payload;
  }

  async function loadShipment() {
    try {
      setLoading(true);
      setError("");
      setActionMessage("");
      setStatusMessage("Loading shipment...");
      const payload = await requestApi("/shipment");
      setShipment(payload.shipment);
      setInitialShipment((prev) => prev || payload.shipment);
      setStatusMessage("Live shipment data loaded.");
    } catch (err) {
      setError(err.message);
      setStatusMessage("Failed to load shipment.");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(endpoint, method, actionText) {
    try {
      setActionLoading(true);
      setError("");
      setActionMessage("");
      setStatusMessage(`${actionText} in progress...`);
      const payload = await requestApi(endpoint, method);
      setShipment(payload.shipment);
      setStatusMessage(payload.message || `${actionText} complete.`);

      if (endpoint === "/simulate") {
        setActionMessage("Disruption detected");
      }
      if (endpoint === "/reroute") {
        setActionMessage("Route optimized successfully");
      }
    } catch (err) {
      setError(err.message);
      setStatusMessage(`${actionText} failed.`);
    } finally {
      setActionLoading(false);
    }
  }

  useEffect(() => {
    loadShipment();
  }, []);

  useEffect(() => {
    if (!chartRef.current || !initialShipment || chartInstanceRef.current) return;
    if (typeof Chart === "undefined") {
      setError("Chart library failed to load.");
      return;
    }

    chartInstanceRef.current = new Chart(chartRef.current, {
      type: "bar",
      data: {
        labels: ["ETA (hours)", "Risk Score"],
        datasets: [
          {
            label: "Before Rerouting",
            data: [initialShipment.eta, initialShipment.risk],
            backgroundColor: "#9ca3af",
            borderRadius: 6,
          },
          {
            label: "After Rerouting",
            data: [initialShipment.eta, initialShipment.risk],
            backgroundColor: "#1d4ed8",
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 380, easing: "easeOutCubic" },
        plugins: { legend: { position: "bottom" } },
        scales: {
          y: { beginAtZero: true, max: 120, ticks: { stepSize: 20 } },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [initialShipment]);

  useEffect(() => {
    if (!chartInstanceRef.current || !shipment || !initialShipment) return;
    const chart = chartInstanceRef.current;
    chart.data.datasets[0].data = [initialShipment.eta, initialShipment.risk];
    chart.data.datasets[1].data = [shipment.eta, shipment.risk];
    chart.update();
  }, [shipment, initialShipment]);

  if (loading) {
    return (
      <div className="page">
        <div className="card card-loading">
          <div className="spinner" aria-hidden="true"></div>
          <p className="loading-text">Loading shipment...</p>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="page">
        <div className="card fade-in">
          <h1>SupplyShield AI</h1>
          <p className="subtitle">Shipment data unavailable.</p>
          <div className="error-banner">
            <span>We could not load data. Please try again.</span>
            <button className="error-action" onClick={loadShipment}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const etaDiff = shipment.eta - initialShipment.eta;
  const riskDiff = shipment.risk - initialShipment.risk;

  return (
    <div className="page">
      <div className="card fade-in">
        <h1>SupplyShield AI</h1>
        <p className="subtitle">Disruption monitoring and rerouting demo</p>

        <div className="status-row">
          <span className={actionLoading ? "pill pill-busy" : "pill"}>
            {actionLoading ? "Updating..." : "Live"}
          </span>
          <span className="status-text">{statusMessage}</span>
        </div>

        {error && (
          <div className="error-banner">
            <span>Something went wrong: {error}</span>
            <button className="error-action" onClick={loadShipment}>Retry</button>
          </div>
        )}

        {actionMessage && <div className="action-note fade-up">{actionMessage}</div>}

        <div className="grid stats-grid">
          <div className="stat-item">
            <span className="stat-label">ETA</span>
            <strong>{shipment.eta} hours</strong>
            <span className={deltaClass(etaDiff)}>{deltaText(etaDiff)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Risk Level</span>
            <div className={riskClass(shipment.risk)}>
              {riskLabel(shipment.risk)} ({shipment.risk})
            </div>
            <span className={deltaClass(riskDiff)}>{deltaText(riskDiff)}</span>
          </div>
          <div className="stat-item stat-impact">
            <span className="stat-label">Impact</span>
            <strong>{shipment.impact || "No active impact"}</strong>
          </div>
        </div>

        <p className="helper-text">Click simulate to trigger disruption.</p>
        <p className="helper-text">Click reroute to optimize route.</p>

        <div className="chart-wrap fade-up">
          <h2>Before vs After Rerouting</h2>
          <div className="chart-box">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>

        <div className="actions">
          <button
            disabled={actionLoading}
            onClick={() => runAction("/simulate", "POST", "Simulate Disruption")}
          >
            {actionLoading ? "Processing..." : "Simulate Disruption"}
          </button>
          <button
            className="secondary"
            disabled={actionLoading}
            onClick={() => runAction("/reroute", "GET", "Reroute")}
          >
            {actionLoading ? "Processing..." : "Reroute"}
          </button>
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
