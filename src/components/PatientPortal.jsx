import React, { useState, useMemo } from "react";
import { 
  Heart, 
  Activity, 
  Pill, 
  BookOpen, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  User,
  Calendar,
  LogOut,
  Moon,
  Sun
} from "lucide-react";

export default function PatientPortal({ 
  patient, 
  onUpdateAdherence, 
  onLogSymptomAlert, 
  onSendMessage,
  onLogout,
  theme,
  setTheme
}) {
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Medication check state (initialized based on patient's current adherence)
  const [takenMeds, setTakenMeds] = useState({
    atorvastatin: patient.med_adherence_pct >= 66,
    metoprolol: patient.med_adherence_pct >= 90,
    lisinopril: patient.med_adherence_pct >= 33
  });

  // Symptom log form states
  const [systolic, setSystolic] = useState("120");
  const [diastolic, setDiastolic] = useState("80");
  const [weight, setWeight] = useState("180");
  const [painLevel, setPainLevel] = useState(2);
  const [symptoms, setSymptoms] = useState({
    chestPain: false,
    shortnessOfBreath: false,
    swollenAnkles: false,
    dizziness: false,
    cough: false
  });
  const [diaryLogs, setDiaryLogs] = useState([
    { date: "Yesterday", bp: "122/82", weight: "179.5 lbs", pain: 2, symptoms: "None" },
    { date: "2 days ago", bp: "119/78", weight: "179.8 lbs", pain: 1, symptoms: "None" }
  ]);
  const [showCriticalNotice, setShowCriticalNotice] = useState(false);

  // Message chat state
  const [chatInput, setChatInput] = useState("");
  const [chatLogs, setChatLogs] = useState(patient.chat_logs || [
    { sender: "doctor", time: "Yesterday, 2:15 PM", content: "Hi John, make sure you take your Metoprolol every morning at 8:00 AM." },
    { sender: "patient", time: "Yesterday, 2:40 PM", content: "Yes doctor, I checked it off on my portal list. Thank you." }
  ]);

  // Compute stats
  const calculatedAdherence = useMemo(() => {
    const medsList = Object.values(takenMeds);
    const takenCount = medsList.filter(Boolean).length;
    return Math.round((takenCount / medsList.length) * 100);
  }, [takenMeds]);

  // Health tip based on primary diagnosis
  const healthTips = useMemo(() => {
    const diag = (patient.primary_diagnosis || "Heart Failure").toLowerCase();
    if (diag.includes("heart") || diag.includes("hypertension")) {
      return [
        "Monitor your daily weight. A sudden gain of 3 lbs or more in 24 hours can indicate fluid retention.",
        "Maintain a low-sodium diet (less than 2,000 mg per day) to help control your blood pressure.",
        "Take light walks daily but rest immediately if you experience dizziness or shortness of breath."
      ];
    } else if (diag.includes("stroke") || diag.includes("neurology")) {
      return [
        "Check your blood pressure daily. Hypertension is a leading risk factor for secondary stroke.",
        "Perform your recommended physical and occupational therapy exercises once every morning.",
        "Know the warning signs of stroke (F.A.S.T.): Facial drooping, Arm weakness, Speech difficulties, Time to call emergency."
      ];
    } else if (diag.includes("diabetes") || diag.includes("ketoacidosis")) {
      return [
        "Log your fasting blood glucose levels each morning prior to breakfast.",
        "Inspect your feet daily for any cuts, blisters, redness, or swelling.",
        "Keep fast-acting carbohydrates (glucose tablets or juice) nearby in case of sudden low blood sugar."
      ];
    }
    return [
      "Stay hydrated by drinking at least 8 glasses of water throughout the day.",
      "Follow your medication schedule exactly as prescribed by your attending doctor.",
      "Get plenty of rest and avoid strenuous physical activities until cleared by your care team."
    ];
  }, [patient]);

  const handleMedToggle = (medKey) => {
    const updated = {
      ...takenMeds,
      [medKey]: !takenMeds[medKey]
    };
    setTakenMeds(updated);
    
    // Calculate new compliance percentage
    const medsList = Object.values(updated);
    const takenCount = medsList.filter(Boolean).length;
    const newAdherence = Math.round((takenCount / medsList.length) * 100);
    
    // Notify parent coordinator state
    onUpdateAdherence(patient.patient_id, newAdherence);
  };

  const handleSymptomSubmit = (e) => {
    e.preventDefault();
    
    const activeSymptoms = Object.entries(symptoms)
      .filter(([_, checked]) => checked)
      .map(([name]) => name.replace(/([A-Z])/g, ' $1').toLowerCase());

    const symptomSummary = activeSymptoms.length > 0 ? activeSymptoms.join(", ") : "None";
    const dateStr = new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

    // Add log
    setDiaryLogs(prev => [
      { 
        date: "Today at " + dateStr, 
        bp: `${systolic}/${diastolic}`, 
        weight: weight + " lbs", 
        pain: painLevel, 
        symptoms: symptomSummary 
      },
      ...prev
    ]);

    // Check critical flags
    const isCritical = symptoms.chestPain || symptoms.shortnessOfBreath || parseFloat(weight) >= 183;
    if (isCritical) {
      setShowCriticalNotice(true);
      // Trigger callback to set symptom alert in parent database
      onLogSymptomAlert(patient.patient_id, "HIGH", `Logged critical symptoms: ${symptomSummary}. Blood pressure: ${systolic}/${diastolic}. Weight: ${weight} lbs.`);
    } else {
      setShowCriticalNotice(false);
      // Clear alert status if safe
      onLogSymptomAlert(patient.patient_id, "LOW", "");
    }

    // Reset symptom checkbox states
    setSymptoms({
      chestPain: false,
      shortnessOfBreath: false,
      swollenAnkles: false,
      dizziness: false,
      cough: false
    });
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (chatInput.trim() === "") return;

    const timeStr = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const newMsg = { sender: "patient", time: "Today, " + timeStr, content: chatInput.trim() };
    
    const updatedMsgs = [...chatLogs, newMsg];
    setChatLogs(updatedMsgs);
    onSendMessage(patient.patient_id, updatedMsgs);
    setChatInput("");

    // Simulate doctor quick response after 2 seconds
    setTimeout(() => {
      const docMsg = { 
        sender: "doctor", 
        time: "Today, " + new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }), 
        content: `Hello ${patient.first_name}, I have received your message and daily symptom log. Please continue to monitor your vitals. If you experience chest pain, go to the nearest emergency room.` 
      };
      const finalMsgs = [...updatedMsgs, docMsg];
      setChatLogs(finalMsgs);
      onSendMessage(patient.patient_id, finalMsgs);
    }, 2000);
  };

  return (
    <div className="app-container patient-layout">
      {/* Patient Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          <div className="logo-container">
            <div className="logo-icon">
              <Heart size={24} fill="var(--color-primary)" />
            </div>
            <span className="logo-text">PulseFlow</span>
          </div>

          <div style={{ padding: "0 16px", marginBottom: "20px" }}>
            <span style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "1px" }}>
              My Health Account
            </span>
          </div>

          <ul className="nav-list">
            <li className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}>
              <button onClick={() => setActiveTab("dashboard")}>
                <Activity size={18} /> My Portal Dashboard
              </button>
            </li>
            <li className={`nav-item ${activeTab === "diary" ? "active" : ""}`}>
              <button onClick={() => setActiveTab("diary")}>
                <BookOpen size={18} /> Daily Health Diary
              </button>
            </li>
            <li className={`nav-item ${activeTab === "chat" ? "active" : ""}`}>
              <button onClick={() => setActiveTab("chat")}>
                <MessageSquare size={18} /> Chat with Care Team
              </button>
            </li>
          </ul>
        </div>

        <div className="sidebar-footer">
          <div className="user-badge" style={{ backgroundColor: "rgba(var(--color-primary-rgb), 0.1)" }}>
            <div className="user-avatar" style={{ backgroundColor: "var(--color-primary)", color: "white" }}>
              {patient.first_name.charAt(0)}
            </div>
            <div className="user-details">
              <span className="user-name">{patient.first_name} {patient.last_name}</span>
              <span className="user-role" style={{ color: "var(--color-primary)" }}>Patient Account</span>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </aside>

      {/* Patient Main panel content */}
      <main className="main-workspace">
        <header className="header-bar">
          <div className="header-title-area">
            <Activity size={20} style={{ color: "var(--color-primary)" }} />
            <h3 style={{ fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {activeTab === "dashboard" && "Patient Medical Portal"}
              {activeTab === "diary" && "Daily Symptom & Vitals Log"}
              {activeTab === "chat" && "Secure Clinic Messenger"}
            </h3>
          </div>

          <div className="header-controls">
            <button className="theme-toggle-btn" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: "500" }}>
              Patient ID: <strong>{patient.patient_id}</strong>
            </span>
          </div>
        </header>

        <div className="workspace-content">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Welcome Card banner */}
              <div className="card-panel-welcome" style={{
                background: "linear-gradient(135deg, var(--color-primary-soft), rgba(var(--color-primary-rgb), 0.05))",
                padding: "24px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)"
              }}>
                <h2 style={{ fontSize: "1.6rem", color: "var(--text-main)" }}>
                  Hello, {patient.first_name}!
                </h2>
                <p style={{ color: "var(--text-muted)", marginTop: "6px", fontSize: "0.95rem" }}>
                  Your vitals look stable today. Keep checking off your daily medicines to lower your readmission risk.
                </p>
                
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginTop: "20px" }}>
                  <div style={{ backgroundColor: "var(--bg-primary)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>ATTENDING DOCTOR</span>
                    <p style={{ fontSize: "1rem", fontWeight: "700", marginTop: "4px" }}>{patient.attending_doctor}</p>
                  </div>
                  <div style={{ backgroundColor: "var(--bg-primary)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>CLINICAL DEPT</span>
                    <p style={{ fontSize: "1rem", fontWeight: "700", marginTop: "4px" }}>{patient.department} Room 304</p>
                  </div>
                  <div style={{ backgroundColor: "var(--bg-primary)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "600" }}>PRIMARY DIAGNOSIS</span>
                    <p style={{ fontSize: "1rem", fontWeight: "700", marginTop: "4px" }}>{patient.primary_diagnosis}</p>
                  </div>
                </div>
              </div>

              {/* Critical Alert Warning banner if patient logged bad symptoms */}
              {(showCriticalNotice || patient.hasSymptomAlert) && (
                <div className="custom-alert-banner danger" style={{ margin: 0 }}>
                  <AlertCircle size={24} style={{ color: "var(--color-danger)" }} />
                  <div className="alert-banner-content">
                    <h4 style={{ fontWeight: "700" }}>Critical Clinical Alert Sent</h4>
                    <p>
                      Your logged symptoms indicate potential complications. A notification has been dispatched 
                      to <strong>{patient.attending_doctor}</strong>. If you are experiencing chest pain, severe shortness 
                      of breath, or a sudden emergency, please call 911 immediately.
                    </p>
                  </div>
                </div>
              )}

              {/* Vitals Beds Monitor Layout */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Activity size={18} style={{ color: "var(--color-primary)" }} /> My Vitals Bedside Roster
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
                    {/* BP Card */}
                    <div className="vital-gauge-card" style={{ borderLeft: "4px solid var(--color-success)" }}>
                      <span className="vital-label">Blood Pressure</span>
                      <div className="vital-value-group">
                        <span className="vital-number">{patient.systolic_bp}/{patient.diastolic_bp}</span>
                        <span className="vital-unit">mmHg</span>
                      </div>
                      <span className="vital-status stable">Normal (Stable)</span>
                    </div>

                    {/* Heart Rate Card */}
                    <div className="vital-gauge-card" style={{ borderLeft: "4px solid var(--color-success)" }}>
                      <span className="vital-label">Heart Rate</span>
                      <div className="vital-value-group">
                        <span className="vital-number">{patient.heart_rate}</span>
                        <span className="vital-unit">bpm</span>
                      </div>
                      <span className="vital-status stable">Regular Pulse</span>
                    </div>

                    {/* SpO2 Card */}
                    <div className="vital-gauge-card" style={{ 
                      borderLeft: `4px solid ${parseInt(patient.oxygen_saturation) < 92 ? "var(--color-danger)" : "var(--color-success)"}`
                    }}>
                      <span className="vital-label">Oxygen Saturation (SpO2)</span>
                      <div className="vital-value-group">
                        <span className="vital-number">{patient.oxygen_saturation}%</span>
                        <span className="vital-unit">SpO2</span>
                      </div>
                      <span className={`vital-status ${parseInt(patient.oxygen_saturation) < 92 ? "critical" : "stable"}`}>
                        {parseInt(patient.oxygen_saturation) < 92 ? "Desaturated (Low)" : "Healthy Oxygen"}
                      </span>
                    </div>

                    {/* Temp Card */}
                    <div className="vital-gauge-card" style={{ borderLeft: "4px solid var(--color-success)" }}>
                      <span className="vital-label">Body Temperature</span>
                      <div className="vital-value-group">
                        <span className="vital-number">{patient.temperature_f}°F</span>
                        <span className="vital-unit">Fahrenheit</span>
                      </div>
                      <span className="vital-status stable">Normal Range</span>
                    </div>
                  </div>
                </div>

                {/* Medication and Health Tips panel */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Adherence Card */}
                  <div className="table-card" style={{ padding: "20px" }}>
                    <h3 style={{ fontSize: "0.95rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <Pill size={16} style={{ color: "var(--color-primary)" }} /> Medication Tracker
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: "16px", marginBottom: "16px" }}>
                      <div className="med-progress-circle" style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "50%",
                        border: "5px solid var(--border-color)",
                        borderTopColor: "var(--color-success)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "700",
                        fontSize: "0.95rem"
                      }}>
                        {calculatedAdherence}%
                      </div>
                      <div>
                        <strong style={{ fontSize: "0.85rem" }}>Adherence Index</strong>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Target threshold: &ge;85%</p>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.8rem" }}>
                        <input 
                          type="checkbox" 
                          checked={takenMeds.atorvastatin} 
                          onChange={() => handleMedToggle("atorvastatin")} 
                        />
                        <div>
                          <strong>Atorvastatin (Lipitor)</strong>
                          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>20mg daily at bedtime</p>
                        </div>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.8rem" }}>
                        <input 
                          type="checkbox" 
                          checked={takenMeds.metoprolol} 
                          onChange={() => handleMedToggle("metoprolol")} 
                        />
                        <div>
                          <strong>Metoprolol Succinate</strong>
                          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>50mg daily at 8:00 AM</p>
                        </div>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", border: "1px solid var(--border-color)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: "0.8rem" }}>
                        <input 
                          type="checkbox" 
                          checked={takenMeds.lisinopril} 
                          onChange={() => handleMedToggle("lisinopril")} 
                        />
                        <div>
                          <strong>Lisinopril (Zestril)</strong>
                          <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>10mg daily at 8:00 AM</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Doctor Prescribed Notes */}
                  {patient.clinical_notes && patient.clinical_notes.length > 0 && (
                    <div className="table-card" style={{ padding: "20px" }}>
                      <h3 style={{ fontSize: "0.95rem", marginBottom: "10px", color: "var(--text-muted)" }}>Attending Doctor Notes</h3>
                      <div className="note-log-item" style={{ padding: 0, border: "none" }}>
                        <p style={{ fontSize: "0.82rem", fontStyle: "italic", whiteSpace: "pre-line" }}>
                          "{patient.clinical_notes[patient.clinical_notes.length - 1].content}"
                        </p>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginTop: "6px", textAlign: "right" }}>
                          — {patient.clinical_notes[patient.clinical_notes.length - 1].author}, {patient.clinical_notes[patient.clinical_notes.length - 1].time}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Patient Education Section */}
              <div className="table-card" style={{ padding: "20px" }}>
                <h3 style={{ fontSize: "0.95rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <BookOpen size={18} style={{ color: "var(--color-primary)" }} /> Patient Education & Care Tips ({patient.primary_diagnosis})
                </h3>
                <ul style={{ fontSize: "0.85rem", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px", color: "var(--text-muted)" }}>
                  {healthTips.map((tip, idx) => (
                    <li key={idx} style={{ lineHeight: "1.5" }}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Daily Diary Tab */}
          {activeTab === "diary" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
              {/* Diary Log Form */}
              <div className="table-card" style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "1rem", marginBottom: "16px" }}>Submit Daily Health Metrics</h3>
                <form onSubmit={handleSymptomSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div className="form-group">
                      <label style={{ fontSize: "0.78rem" }}>Systolic BP (mmHg)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={systolic} 
                        onChange={(e) => setSystolic(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: "0.78rem" }}>Diastolic BP (mmHg)</label>
                      <input 
                        type="number" 
                        className="input-field" 
                        value={diastolic} 
                        onChange={(e) => setDiastolic(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: "0.78rem" }}>Body Weight (lbs)</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={weight} 
                      onChange={(e) => setWeight(e.target.value)} 
                      required 
                    />
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Baseline dry weight: 180 lbs</span>
                  </div>

                  <div className="form-group">
                    <div className="flex-row-between">
                      <label style={{ fontSize: "0.78rem" }}>General Pain Scale</label>
                      <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "var(--color-primary)" }}>{painLevel}/10</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={painLevel} 
                      onChange={(e) => setPainLevel(parseInt(e.target.value))} 
                      className="input-range"
                      style={{ marginTop: "8px" }}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ fontSize: "0.78rem", marginBottom: "8px", display: "block" }}>Check Active Symptoms Today</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem" }}>
                        <input 
                          type="checkbox" 
                          checked={symptoms.chestPain} 
                          onChange={(e) => setSymptoms(prev => ({ ...prev, chestPain: e.target.checked }))} 
                        />
                        <span style={{ color: "var(--color-danger)", fontWeight: "600" }}>Chest pain / tightness</span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem" }}>
                        <input 
                          type="checkbox" 
                          checked={symptoms.shortnessOfBreath} 
                          onChange={(e) => setSymptoms(prev => ({ ...prev, shortnessOfBreath: e.target.checked }))} 
                        />
                        <span style={{ color: "var(--color-danger)", fontWeight: "600" }}>Shortness of breath (dyspnea)</span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem" }}>
                        <input 
                          type="checkbox" 
                          checked={symptoms.swollenAnkles} 
                          onChange={(e) => setSymptoms(prev => ({ ...prev, swollenAnkles: e.target.checked }))} 
                        />
                        <span>Swollen ankles / feet edema</span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem" }}>
                        <input 
                          type="checkbox" 
                          checked={symptoms.dizziness} 
                          onChange={(e) => setSymptoms(prev => ({ ...prev, dizziness: e.target.checked }))} 
                        />
                        <span>Dizziness / lightheadedness</span>
                      </label>

                      <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem" }}>
                        <input 
                          type="checkbox" 
                          checked={symptoms.cough} 
                          onChange={(e) => setSymptoms(prev => ({ ...prev, cough: e.target.checked }))} 
                        />
                        <span>Severe dry coughing</span>
                      </label>
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" style={{ width: "100%", padding: "12px", marginTop: "8px" }}>
                    Log Daily Stats & Symptoms
                  </button>
                </form>
              </div>

              {/* Historical Logs List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <h3 style={{ fontSize: "1rem" }}>My Logs History</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "400px", overflowY: "auto" }}>
                  {diaryLogs.map((log, idx) => (
                    <div key={idx} className="table-card" style={{ padding: "16px", backgroundColor: "var(--bg-primary)" }}>
                      <div className="flex-row-between" style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: "6px", marginBottom: "8px" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--color-primary)" }}>{log.date}</span>
                        <span className="risk-badge" style={{ backgroundColor: "var(--color-success-soft)", color: "var(--color-success)" }}>Logged</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.78rem" }}>
                        <div><strong>Blood Pressure:</strong> {log.bp}</div>
                        <div><strong>Body Weight:</strong> {log.weight}</div>
                        <div><strong>Pain Index:</strong> {log.pain}/10</div>
                        <div style={{ gridColumn: "span 2" }}>
                          <strong>Symptoms: </strong> 
                          <span style={{ 
                            color: log.symptoms !== "None" ? "var(--color-danger)" : "var(--text-muted)",
                            fontWeight: log.symptoms !== "None" ? "600" : "400"
                          }}>{log.symptoms}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Secure Chat Tab */}
          {activeTab === "chat" && (
            <div className="table-card" style={{ display: "flex", flexDirection: "column", height: "480px", padding: 0 }}>
              {/* Chat Header */}
              <div className="flex-row-between" style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div className="user-avatar" style={{ backgroundColor: "var(--color-secondary)", color: "white" }}>
                    SS
                  </div>
                  <div>
                    <h4 style={{ fontSize: "0.88rem", fontWeight: "700" }}>{patient.attending_doctor}</h4>
                    <span style={{ fontSize: "0.7rem", color: "var(--color-success)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle size={10} fill="var(--color-success)" /> Active Attending Doctor
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Cardiology Division</span>
              </div>

              {/* Chat Message Scroll */}
              <div style={{ flex: 1, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
                {chatLogs.map((msg, idx) => {
                  const isDoc = msg.sender === "doctor";
                  return (
                    <div 
                      key={idx} 
                      style={{ 
                        alignSelf: isDoc ? "flex-start" : "flex-end",
                        maxWidth: "75%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isDoc ? "flex-start" : "flex-end"
                      }}
                    >
                      <div style={{ 
                        padding: "10px 14px", 
                        borderRadius: "var(--radius-md)", 
                        backgroundColor: isDoc ? "var(--bg-primary)" : "var(--color-primary-soft)",
                        color: "var(--text-main)",
                        border: "1px solid var(--border-color)",
                        fontSize: "0.85rem",
                        lineHeight: "1.4"
                      }}>
                        {msg.content}
                      </div>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "4px" }}>
                        {isDoc ? patient.attending_doctor : "Me"} • {msg.time}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Chat Input Toolbar */}
              <form onSubmit={handleSendChat} style={{ padding: "16px", borderTop: "1px solid var(--border-color)", display: "flex", gap: "12px", backgroundColor: "var(--bg-primary)" }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Type secure medical message to Dr. Strange..."
                  value={chatInput} 
                  onChange={(e) => setChatInput(e.target.value)} 
                  required
                />
                <button type="submit" className="btn-primary" style={{ flexShrink: 0, padding: "10px 18px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Send size={14} /> Send
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
