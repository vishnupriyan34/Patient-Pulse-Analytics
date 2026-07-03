import React, { useState } from "react";
import { KeyRound, Mail, AlertTriangle, Eye, EyeOff, ShieldCheck, User, UserPlus } from "lucide-react";

// Attending users configuration
const defaultUsers = {
  "admin@pulseflow.com": { role: "admin", name: "Administrator", pass: "admin" },
  "doctor@pulseflow.com": { role: "doctor", name: "Dr. Stephen Strange", pass: "doctor" },
  "patient@pulseflow.com": { role: "patient", name: "John Doe", pass: "patient" },
  "analyst@pulseflow.com": { role: "analyst", name: "Sarah Connor (Analyst)", pass: "analyst" }
};

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("doctor");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Sign up states
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpRole, setSignUpRole] = useState("patient");

  // Forgot password flow states
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: Reset
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpVal, setOtpVal] = useState("");
  const [newPass, setNewPass] = useState("");
  const [activeUsers, setActiveUsers] = useState(defaultUsers);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const matchedUser = activeUsers[email.trim().toLowerCase()];
    if (matchedUser && matchedUser.pass === password) {
      if (matchedUser.role !== selectedRole) {
        setErrorMsg(`Account exists but is registered under the role "${matchedUser.role.toUpperCase()}". Please select the correct role context.`);
        return;
      }
      onLoginSuccess(matchedUser.role, matchedUser.name, email.trim().toLowerCase());
    } else {
      setErrorMsg("Invalid email or password. Please use the testing credentials below.");
    }
  };

  const handleSignUpSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const normalizedEmail = signUpEmail.trim().toLowerCase();
    
    if (activeUsers[normalizedEmail]) {
      setErrorMsg("An account with this email address already exists.");
      return;
    }

    if (signUpPassword.length < 4) {
      setErrorMsg("Password must be at least 4 characters long.");
      return;
    }

    // Add new user to active credentials
    setActiveUsers(prev => ({
      ...prev,
      [normalizedEmail]: {
        role: signUpRole,
        name: signUpName.trim(),
        pass: signUpPassword
      }
    }));

    setSuccessMsg(`Account created for ${signUpName} (${signUpRole.toUpperCase()}) successfully! Please log in.`);
    
    // Autofill login and toggle back
    setEmail(normalizedEmail);
    setPassword(signUpPassword);
    setSelectedRole(signUpRole);
    setIsSignUpMode(false);
    
    // Clear inputs
    setSignUpName("");
    setSignUpEmail("");
    setSignUpPassword("");
    setSignUpRole("patient");
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (forgotStep === 1) {
      if (!activeUsers[forgotEmail.trim().toLowerCase()]) {
        setErrorMsg("Email address not found in active credentials.");
        return;
      }
      setErrorMsg("");
      setForgotStep(2);
    } else if (forgotStep === 2) {
      if (otpVal === "123456") {
        setErrorMsg("");
        setForgotStep(3);
      } else {
        setErrorMsg("Invalid verification code. Enter '123456' for verification.");
      }
    } else if (forgotStep === 3) {
      if (newPass.length < 4) {
        setErrorMsg("Password must be at least 4 characters long.");
        return;
      }
      // Update local credentials mapping
      setActiveUsers(prev => ({
        ...prev,
        [forgotEmail.trim().toLowerCase()]: {
          ...prev[forgotEmail.trim().toLowerCase()],
          pass: newPass
        }
      }));
      setErrorMsg("");
      setSuccessMsg("Password reset successfully! You can now log in.");
      setIsForgotMode(false);
      setForgotStep(1);
      setPassword(newPass);
      setEmail(forgotEmail);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card" style={{ maxWidth: "440px", width: "100%" }}>
        <div className="login-header">
          <div className="login-logo">
            <ShieldCheck size={48} />
          </div>
          <h1>PulseFlow</h1>
          <p className="login-subtitle">Clinical & Operational Healthcare Analytics</p>
        </div>

        {errorMsg && (
          <div className="custom-alert-banner danger" style={{ padding: "10px 14px", margin: "0 0 16px 0" }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
            <div className="alert-banner-content">
              <p style={{ fontSize: "0.82rem", fontWeight: "500" }}>{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="custom-alert-banner success" style={{ padding: "10px 14px", margin: "0 0 16px 0" }}>
            <div className="alert-banner-content">
              <p style={{ fontSize: "0.82rem", fontWeight: "500", color: "var(--color-success)" }}>{successMsg}</p>
            </div>
          </div>
        )}

        {!isForgotMode && !isSignUpMode && (
          <>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label>Email Address</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="name@pulseflow.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: "40px" }}
                  />
                  <Mail size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                </div>
              </div>

              <div className="form-group">
                <div className="flex-row-between">
                  <label>Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(true);
                      setErrorMsg("");
                      setSuccessMsg("");
                    }}
                    style={{ background: "none", border: "none", color: "var(--color-primary)", fontSize: "0.8rem", cursor: "pointer", fontWeight: "600" }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="input-field"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: "40px", paddingRight: "40px" }}
                  />
                  <KeyRound size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Select Role Context</label>
                <div className="role-selector-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                  {["admin", "doctor", "patient", "analyst"].map((role) => (
                    <label key={role} className={`role-radio-label ${selectedRole === role ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="role"
                        value={role}
                        checked={selectedRole === role}
                        onChange={() => setSelectedRole(role)}
                      />
                      <span style={{ textTransform: "capitalize" }}>{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" className="login-action-btn">
                Authenticate Account
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Don't have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setIsSignUpMode(true);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                style={{ background: "none", border: "none", color: "var(--color-primary)", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Sign Up
              </button>
            </div>
          </>
        )}

        {isSignUpMode && (
          <form onSubmit={handleSignUpSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="form-group">
              <label>Full Name</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. John Doe"
                  required
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  style={{ paddingLeft: "40px" }}
                />
                <User size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  className="input-field"
                  placeholder="name@pulseflow.com"
                  required
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  style={{ paddingLeft: "40px" }}
                />
                <Mail size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Create password"
                  required
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  style={{ paddingLeft: "40px" }}
                />
                <KeyRound size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              </div>
            </div>

            <div className="form-group">
              <label>Choose Account Role</label>
              <div className="role-selector-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                {["admin", "doctor", "patient", "analyst"].map((role) => (
                  <label key={role} className={`role-radio-label ${signUpRole === role ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="signUpRole"
                      value={role}
                      checked={signUpRole === role}
                      onChange={() => setSignUpRole(role)}
                    />
                    <span style={{ textTransform: "capitalize" }}>{role}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="login-action-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <UserPlus size={16} /> Create Account
            </button>

            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Already have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setIsSignUpMode(false);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                style={{ background: "none", border: "none", color: "var(--color-primary)", fontWeight: "700", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Log In
              </button>
            </div>
          </form>
        )}

        {isForgotMode && (
          <form onSubmit={handleForgotSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {forgotStep === 1 && (
              <div className="form-group">
                <label>Enter Registered Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="user@pulseflow.com"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  We will send a simulated 6-digit OTP code to verify your request.
                </p>
              </div>
            )}

            {forgotStep === 2 && (
              <div className="form-group">
                <label>Enter Verification Code</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter '123456'"
                  required
                  value={otpVal}
                  onChange={(e) => setOtpVal(e.target.value)}
                  maxLength={6}
                />
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "4px" }}>
                  Please enter the code <strong>123456</strong> to proceed.
                </p>
              </div>
            )}

            {forgotStep === 3 && (
              <div className="form-group">
                <label>Enter New Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="New password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setIsForgotMode(false);
                  setForgotStep(1);
                  setErrorMsg("");
                  setSuccessMsg("");
                }}
                style={{ flex: 1, padding: "12px" }}
              >
                Back to Login
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1, padding: "12px" }}>
                {forgotStep === 1 ? "Send Code" : forgotStep === 2 ? "Verify OTP" : "Reset Password"}
              </button>
            </div>
          </form>
        )}

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "16px" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "6px" }}>
            Quick Testing Credentials (Email / Password):
          </p>
          <ul style={{ fontSize: "0.75rem", color: "var(--text-muted)", paddingLeft: "16px", lineHeight: "1.6" }}>
            <li><strong>Admin:</strong> admin@pulseflow.com / admin</li>
            <li><strong>Doctor:</strong> doctor@pulseflow.com / doctor</li>
            <li><strong>Patient:</strong> patient@pulseflow.com / patient</li>
            <li><strong>Analyst:</strong> analyst@pulseflow.com / analyst</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
