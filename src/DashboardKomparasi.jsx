import axios from "axios";
import { format, startOfWeek } from "date-fns";
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  Filter,
  LogOut,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import "./DashboardKomparasi.css";

// Mock list of UPTs since it's not provided in the specification.
// In a real scenario, this could be fetched from another API endpoint.
const UPT_LIST = [
  { kdcabang: "13", name: "Surabaya Timur" },
  { kdcabang: "11", name: "Surabaya Barat" },
  { kdcabang: "14", name: "Surabaya Utara" },
  { kdcabang: "15", name: "Surabaya Selatan" },
  { kdcabang: "21", name: "Gresik" },
  { kdcabang: "23", name: "Sidoarjo" },
  { kdcabang: "24", name: "Mojokerto" },
  { kdcabang: "25", name: "Jombang" },
  { kdcabang: "31", name: "Bojonegoro" },
  { kdcabang: "32", name: "Lamongan" },
  { kdcabang: "33", name: "Tuban" },
  { kdcabang: "42", name: "Madiun" },
  { kdcabang: "43", name: "Ngawi" },
  { kdcabang: "44", name: "Magetan" },
  { kdcabang: "45", name: "Ponorogo" },
  { kdcabang: "46", name: "Pacitan" },
  { kdcabang: "52", name: "Kediri" },
  { kdcabang: "53", name: "Blitar" },
  { kdcabang: "54", name: "Tulungagung" },
  { kdcabang: "55", name: "Trenggalek" },
  { kdcabang: "56", name: "Nganjuk" },
  { kdcabang: "61", name: "Malang Kota" },
  { kdcabang: "62", name: "Malang Utara" },
  { kdcabang: "63", name: "Malang Selatan" },
  { kdcabang: "64", name: "Pasuruan" },
  { kdcabang: "65", name: "Probolinggo" },
  { kdcabang: "66", name: "Lumajang" },
  { kdcabang: "71", name: "Jember" },
  { kdcabang: "73", name: "Bondowoso" },
  { kdcabang: "74", name: "Situbondo" },
  { kdcabang: "75", name: "Banyuwangi" },
  { kdcabang: "81", name: "Pamekasan" },
  { kdcabang: "82", name: "Sampang" },
  { kdcabang: "83", name: "Bangkalan" },
  { kdcabang: "84", name: "Sumenep" },
];

const JENIS_PENERIMAAN_OPTIONS = [
  { value: "PKB", label: "Pajak Kendaraan Bermotor (PKB)" },
  { value: "BBNKB", label: "Bea Balik Nama Kendaraan Bermotor (BBNKB)" },
];

let silentLoginPromise = null;

const attemptSilentLogin = () => {
  if (silentLoginPromise) return silentLoginPromise;

  const user = localStorage.getItem("monipad_user");
  const hash = localStorage.getItem("monipad_hash");

  if (!user || !hash) return Promise.resolve(false);

  silentLoginPromise = new Promise(async (resolve) => {
    try {
      const payload = new URLSearchParams({ u: user, p: hash });
      const res = await axios.post("/monipad/index.php/user/login", payload, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        withCredentials: true,
      });

      if (res.data && (res.data.id === 1 || res.data.id === "1" || res.data.msg === "Sukses")) {
        // Jeda waktu agar CodeIgniter selesai menulis file session ke disk
        setTimeout(() => resolve(true), 1000);
      } else {
        resolve(false);
      }
    } catch (e) {
      resolve(false);
    } finally {
      setTimeout(() => { silentLoginPromise = null; }, 3000);
    }
  });

  return silentLoginPromise;
};

export default function DashboardKomparasi({ onLogout }) {
  // Default startDate: Senin di minggu ini
  const [startDate, setStartDate] = useState(
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [jenisPenerimaan, setJenisPenerimaan] = useState("PKB");

  // Application States
  const [isLoading, setIsLoading] = useState(false);
  const [uptData, setUptData] = useState([]);
  const [provinsiStats, setProvinsiStats] = useState({
    totalTarget: 0,
    totalRealisasi: 0,
    rataRataProsentase: 0,
  });
  const [errorMsg, setErrorMsg] = useState(null);

  // Initialize data on first load
  useEffect(() => {
    fetchData();
  }, []); // Run once on mount

  // Removed handleLogin function as it is now handled by Login.jsx

  const fetchUPTData = async (kdcabang, isRetry = false) => {
    const payload = new URLSearchParams({
      kdcabang: kdcabang,
      awal: startDate,
      akhir: endDate,
    });

    try {
      const response = await axios.post(
        "/monipad/index.php/ws/ReportUpt/getPenkasPeriodeTgl",
        payload,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          withCredentials: true,
        },
      );

      if (response.data) {
        if (response.data.msg && response.data.msg.toLowerCase().includes("sesi anda habis")) {
          // Attempt silent relogin (like token refresh)
          if (!isRetry) {
            const silentLoginSuccess = await attemptSilentLogin();
            if (silentLoginSuccess) {
              // Stagger retries dengan delay acak untuk mencegah Session Lock massal pada sesi yang baru dibuat
              await new Promise(r => setTimeout(r, Math.random() * 1500));
              return await fetchUPTData(kdcabang, true); // Retry ONCE
            }
          }
          if (onLogout) onLogout();
          throw new Error("SESSION_EXPIRED");
        }
        if (response.data.msg === "Sukses" && response.data.data) {
          return response.data.data;
        }
      }
      return null;
    } catch (error) {
      if (error.message === "SESSION_EXPIRED") {
        throw error;
      }
      console.warn(
        `Failed fetching UPT ${kdcabang}, using mock data for demonstration.`,
      );
      // Mock Data Fallback for Demonstration in case of CORS or API issues
      return generateMockResponse(jenisPenerimaan);
    }
  };

  const generateMockResponse = (jenis) => {
    const target = Math.floor(Math.random() * 200000000000) + 50000000000;
    const realisasi = Math.floor(target * (Math.random() * 0.6 + 0.2)); // 20% to 80%
    const prosentase = ((realisasi / target) * 100).toFixed(2);

    return [
      {
        SKT: jenis,
        TARGET: target.toString(),
        JML_PEN: realisasi.toString(),
        PRO_PEN: prosentase.toString(),
      },
    ];
  };

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const results = [];
      // Solusi Jalan Tengah: Menggunakan teknik "Batching / Concurrency Control"
      // Membagi request ke dalam kelompok (batch) isi 5 untuk mempercepat waktu load,
      // tanpa membanjiri PHP Session backend yang bisa menyebabkan Session Lock.
      const CONCURRENCY_LIMIT = 5;

      for (let i = 0; i < UPT_LIST.length; i += CONCURRENCY_LIMIT) {
        const batch = UPT_LIST.slice(i, i + CONCURRENCY_LIMIT);

        const batchPromises = batch.map(async (upt) => {
          const dataArray = await fetchUPTData(upt.kdcabang);
          let extractedData = {
            target: 0,
            realisasi: 0,
            prosentase: 0,
          };

          if (dataArray) {
            const rowData = dataArray.find(
              (row) => row.SKT === jenisPenerimaan,
            );
            if (rowData) {
              extractedData = {
                target: parseFloat(rowData.TARGET) || 0,
                realisasi: parseFloat(rowData.JML_PEN) || 0,
                prosentase: parseFloat(rowData.PRO_PEN) || 0,
              };
            }
          }

          return {
            ...upt,
            ...extractedData,
          };
        });

        // Tunggu batch ini selesai sebelum lanjut ke batch berikutnya
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      // 4. Kriteria Kalkulasi UPT di Bawah Rata-Rata
      let totalTargetProv = 0;
      let totalRealisasiProv = 0;

      results.forEach((res) => {
        totalTargetProv += res.target;
        totalRealisasiProv += res.realisasi;
      });

      const rataRataProvinsi =
        totalTargetProv > 0 ? (totalRealisasiProv / totalTargetProv) * 100 : 0;

      const roundedRataRata = Number(rataRataProvinsi.toFixed(2));

      // Evaluate status for each UPT based on the calculated provincial average
      const evaluatedResults = results.map((res) => {
        const roundedProsentase = Number(res.prosentase.toFixed(2));
        return {
          ...res,
          diBawahRataRata: roundedProsentase < roundedRataRata,
        };
      });

      // Sort: tertinggi ke terendah berdasarkan prosentase (highest percentage first)
      evaluatedResults.sort((a, b) => b.prosentase - a.prosentase);

      setProvinsiStats({
        totalTarget: totalTargetProv,
        totalRealisasi: totalRealisasiProv,
        rataRataProsentase: rataRataProvinsi,
      });
      setUptData(evaluatedResults);
    } catch (error) {
      console.error(error);
      if (error.message !== "SESSION_EXPIRED") {
        setErrorMsg("Terjadi kesalahan saat mengambil data UPT.");
      } else {
        setErrorMsg("Sesi Anda telah habis. Silakan login kembali.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Dashboard Komparasi & Kinerja UPT PPD</h1>
          <p>Evaluasi Performa Penerimaan Pendapatan Daerah</p>
        </div>
        <button className="btn-logout" onClick={onLogout} title="Keluar">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </header>

      {/* GLOBAL FILTER CONTROLS */}
      <section className="filter-section glass-panel">
        <div className="filter-header">
          <Filter size={20} className="text-primary" />
          <h2>Kontrol Filter Global</h2>
        </div>

        <div className="filter-controls">
          <div className="input-group">
            <label>Tanggal Mulai</label>
            <div className="input-wrapper">
              <Calendar size={18} className="input-icon" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="modern-input"
              />
            </div>
          </div>

          <div className="input-group">
            <label>Tanggal Selesai</label>
            <div className="input-wrapper">
              <Calendar size={18} className="input-icon" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="modern-input"
              />
            </div>
          </div>

          <div className="input-group">
            <label>Jenis Penerimaan</label>
            <div className="input-wrapper">
              <select
                value={jenisPenerimaan}
                onChange={(e) => setJenisPenerimaan(e.target.value)}
                className="modern-select"
              >
                {JENIS_PENERIMAAN_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="select-icon" />
            </div>
          </div>

          <div className="filter-action">
            <button
              className="btn-primary"
              onClick={fetchData}
              disabled={isLoading}
            >
              {isLoading ? "Memproses..." : "Cari / Filter"}
            </button>
          </div>
        </div>
      </section>

      {/* PROVINCIAL AGGREGATE SUMMARY */}
      <section className="summary-section">
        <div className="summary-card total-target">
          <h3>Total Target Provinsi ({jenisPenerimaan})</h3>
          <p className="amount">
            {isLoading ? (
              <Loader2 className="animate-spin text-primary" size={24} />
            ) : (
              formatCurrency(provinsiStats.totalTarget)
            )}
          </p>
        </div>
        <div className="summary-card total-realisasi">
          <h3>Total Realisasi Provinsi</h3>
          <p className="amount">
            {isLoading ? (
              <Loader2 className="animate-spin text-primary" size={24} />
            ) : (
              formatCurrency(provinsiStats.totalRealisasi)
            )}
          </p>
        </div>
        <div className="summary-card average-card glass-panel-accent">
          <h3>Rata-Rata Persentase Provinsi</h3>
          <div className="average-value-wrapper">
            <span className="average-percent">
              {isLoading ? (
                <Loader2 className="animate-spin text-primary" size={28} />
              ) : (
                `${provinsiStats.rataRataProsentase.toFixed(2)}%`
              )}
            </span>
          </div>
        </div>
      </section>

      {errorMsg && (
        <div className="error-banner">
          <AlertTriangle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* UPT PERFORMANCE TABLE */}
      <section className="data-table-container glass-panel">
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Mengeksekusi kalkulasi performa UPT...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="modern-data-table">
              <thead>
                <tr>
                  <th rowSpan="2" className="text-center">
                    NO
                  </th>
                  <th rowSpan="2">UPT PPD</th>
                  <th rowSpan="2" className="text-right">
                    TARGET
                  </th>
                  <th colSpan="2" className="text-center">
                    REALISASI
                  </th>
                </tr>
                <tr>
                  <th className="text-right">
                    Periode {format(new Date(startDate), "dd MMM yyyy")} s/d{" "}
                    {format(new Date(endDate), "dd MMM yyyy")}
                  </th>
                  <th className="text-center">%</th>
                </tr>
              </thead>
              <tbody>
                {uptData.map((upt, index) => (
                  <tr
                    key={upt.kdcabang}
                    className={
                      upt.diBawahRataRata
                        ? "table-row-danger"
                        : "table-row-safe"
                    }
                  >
                    <td className="text-center">{index + 1}</td>
                    <td>{upt.name}</td>
                    <td className="text-right">{formatCurrency(upt.target)}</td>
                    <td className="text-right">
                      {formatCurrency(upt.realisasi)}
                    </td>
                    <td className="text-center font-bold">
                      {upt.prosentase.toFixed(2).replace(".", ",")}%
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" className="text-center font-bold">
                    RATA-RATA REALISASI
                  </td>
                  <td className="text-right font-bold"></td>
                  <td className="text-right font-bold">
                    {formatCurrency(
                      uptData.length > 0
                        ? provinsiStats.totalRealisasi / uptData.length
                        : 0,
                    )}
                  </td>
                  <td className="text-center font-bold text-lg">
                    {provinsiStats.rataRataProsentase
                      .toFixed(2)
                      .replace(".", ",")}
                    %
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
