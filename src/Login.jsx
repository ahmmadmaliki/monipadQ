import axios from "axios";
import CryptoJS from "crypto-js";
import { AlertCircle, Loader2, Lock, User } from "lucide-react";
import { useState } from "react";
import "./Login.css";

export default function Login({ onLoginSuccess }) {
  // Menggunakan default value dari screenshot payload yang diberikan sebelumnya
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    // Hash password menggunakan SHA-1 sebelum dikirim ke server lama
    const hashedPassword = CryptoJS.SHA1(password).toString();

    const payload = new URLSearchParams({
      u: username,
      p: hashedPassword,
    });

    try {
      // Axios dengan withCredentials agar ci_session cookie tersimpan di browser
      const response = await axios.post(
        "/monipad/index.php/user/login",
        payload,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          withCredentials: true,
        },
      );

      // Cek apakah response backend menyatakan sukses
      if (response.data && (response.data.id === 1 || response.data.id === "1" || response.data.msg === "Sukses")) {
        localStorage.setItem('monipad_user', username);
        localStorage.setItem('monipad_hash', hashedPassword);
        onLoginSuccess();
      } else {
        // Backend mengembalikan status gagal (seperti "Account not found")
        setErrorMsg(response.data.msg || "Login gagal. Silakan periksa kembali kredensial Anda.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      setErrorMsg(
        "Gagal melakukan login. Periksa kembali koneksi atau kredensial Anda.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="logo-placeholder">
            <User size={32} className="text-primary" />
          </div>
          <h2>Portal Monipad</h2>
          <p>Login untuk mengakses Dashboard Kinerja UPT PPD</p>
        </div>

        {errorMsg && (
          <div className="login-error">
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>Username</label>
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="modern-input"
                placeholder="Masukkan username"
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label>Password</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="modern-input"
                placeholder="Masukkan password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary login-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Memproses...
              </>
            ) : (
              "Masuk ke Dashboard"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
