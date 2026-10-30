import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  Code2,
  Copy,
  ExternalLink,
  Layers3,
  LockKeyhole,
  Minus,
  Plus,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { BrowserProvider, Contract, getAddress, isAddress, JsonRpcProvider, parseEther } from "ethers";
import { CONTRACT_ABI, FREE_FEE, PAID_PRICE } from "./contract";
import "./styles.css";

type MintKind = "free" | "paid";
type Notice = { kind: "info" | "success" | "error"; text: string; tx?: string } | null;
type Supply = { free: number; paid: number };

const ALLOCATION = 5_000;
const CONFIGURED_CHAIN_ID = import.meta.env.VITE_CHAIN_ID?.trim();
const TARGET_CHAIN = CONFIGURED_CHAIN_ID ? readChainId(CONFIGURED_CHAIN_ID) : 56n;
const RAW_CONTRACT = (import.meta.env.VITE_CONTRACT_ADDRESS ?? "").trim();
const CONTRACT_ADDRESS = isAddress(RAW_CONTRACT) ? getAddress(RAW_CONTRACT) : "";
const CHAIN_NAME = "BSC Mainnet";
const RPC_URL = (import.meta.env.VITE_RPC_URL ?? (TARGET_CHAIN === 56n ? "https://bsc-dataseed.bnbchain.org" : "")).trim();
const EXPLORER_URL = (import.meta.env.VITE_EXPLORER_URL ?? (TARGET_CHAIN === 56n ? "https://bscscan.com" : "")).replace(/\/$/, "");
const NATIVE_SYMBOL = "BNB";
const BNB_CHAIN_CONFIG = TARGET_CHAIN === 56n
  ? { chainId: "0x38", chainName: "BSC Mainnet", nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, rpcUrls: [RPC_URL], blockExplorerUrls: ["https://bscscan.com"] }
  : null;
const LIVE_READY = Boolean(CONTRACT_ADDRESS && TARGET_CHAIN === 56n);

function readChainId(value?: string): bigint | null {
  if (!value?.trim()) return null;
  try {
    const parsed = BigInt(value.trim());
    return parsed > 0n ? parsed : null;
  } catch {
    return null;
  }
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function createAgentPrompt(kind: MintKind, quantity: number) {
  const chain = CHAIN_NAME || "[NAMA_JARINGAN_EVM]";
  const chainId = TARGET_CHAIN?.toString() ?? "[CHAIN_ID]";
  const address = CONTRACT_ADDRESS || "[ALAMAT_KONTRAK_SETELAH_DEPLOY]";
  if (kind === "free") {
    return `Saya ingin mint ${quantity} NFT craftmeetcode dari alokasi FREEMINT di ${chain} (chain ID ${chainId}).\nKontrak: ${address}\nPanggil mintFree(${quantity}) dan kirim tepat ${FREE_FEE} ${NATIVE_SYMBOL} per NFT (total ${(Number(FREE_FEE) * quantity).toFixed(4)} ${NATIVE_SYMBOL}), di luar gas jaringan. Verifikasi fungsi dan harga pada kontrak, periksa sisa alokasi freemint serta alamat treasury yang tersimpan di kontrak. Tampilkan detail transaksi terlebih dahulu dan tunggu konfirmasi saya di wallet sebelum mengirim. Jangan gunakan mintPaid. Jangan pernah meminta atau membagikan seed phrase/private key saya.`;
  }
  return `Saya ingin mint ${quantity} NFT craftmeetcode dari alokasi PAID MINT di ${chain} (chain ID ${chainId}).\nKontrak: ${address}\nPanggil mintPaid(${quantity}) dengan nilai tepat ${PAID_PRICE} ${NATIVE_SYMBOL} per NFT (total ${(Number(PAID_PRICE) * quantity).toFixed(3)} ${NATIVE_SYMBOL}), di luar gas jaringan. Verifikasi fungsi, harga, dan sisa alokasi paid mint pada kontrak sebelum menyiapkan transaksi. Tampilkan detail transaksi terlebih dahulu dan tunggu konfirmasi saya di wallet sebelum mengirim. Jangan gunakan mintFree. Jangan pernah meminta atau membagikan seed phrase/private key saya.`;
}

function getInjectedProvider() {
  return window.ethereum ? new BrowserProvider(window.ethereum, "any") : null;
}

function wasRejected(error: unknown) {
  const value = error as { code?: number | string; info?: { error?: { code?: number } }; message?: string; shortMessage?: string };
  return value.code === 4001 || value.code === "ACTION_REJECTED" || value.info?.error?.code === 4001 || /user (rejected|denied)|request rejected/i.test(`${value.message ?? ""} ${value.shortMessage ?? ""}`);
}

export default function App() {
  const [account, setAccount] = useState("");
  const [walletChain, setWalletChain] = useState<bigint | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [supply, setSupply] = useState<Supply>({ free: 0, paid: 0 });
  const [supplyIsLive, setSupplyIsLive] = useState(false);
  const [treasuryAddress, setTreasuryAddress] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<MintKind | "connect" | null>(null);
  const [copied, setCopied] = useState<MintKind | null>(null);
  const [promptOpen, setPromptOpen] = useState<MintKind | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const totalMinted = supply.free + supply.paid;
  const freeRemaining = Math.max(0, ALLOCATION - supply.free);
  const paidRemaining = Math.max(0, ALLOCATION - supply.paid);
  const chainMatches = TARGET_CHAIN === null || walletChain === TARGET_CHAIN;
  const formatCount = (n: number) => new Intl.NumberFormat("id-ID").format(n);

  const updateSupply = useCallback(async (provider: BrowserProvider | null) => {
    if (!LIVE_READY || !CONTRACT_ADDRESS) return;
    try {
      const readProvider = provider ?? (RPC_URL ? new JsonRpcProvider(RPC_URL) : null);
      if (!readProvider) return;
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
      const [free, paid, treasury] = await Promise.all([contract.freeMinted(), contract.paidMinted(), contract.treasury()]);
      setSupply({ free: Number(free), paid: Number(paid) });
      setTreasuryAddress(String(treasury));
      setSupplyIsLive(true);
    } catch {
      setSupplyIsLive(false);
      setTreasuryAddress("");
    }
  }, []);

  useEffect(() => {
    const provider = getInjectedProvider();
    void updateSupply(provider);
  }, [updateSupply]);

  useEffect(() => {
    const ethereum = window.ethereum;
    if (!ethereum?.on) return;
    const onAccounts = (accounts: string[]) => setAccount(accounts[0] ?? "");
    const onChain = (chainHex: string) => {
      try { setWalletChain(BigInt(chainHex)); } catch { setWalletChain(null); }
    };
    ethereum.on("accountsChanged", onAccounts);
    ethereum.on("chainChanged", onChain);
    return () => {
      ethereum.removeListener?.("accountsChanged", onAccounts);
      ethereum.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connectWallet = async () => {
    const provider = getInjectedProvider();
    if (!provider) {
      setNotice({ kind: "error", text: "Wallet EVM tidak ditemukan. Buka situs melalui browser wallet atau pasang wallet yang kompatibel." });
      return;
    }
    setBusy("connect");
    setNotice({ kind: "info", text: "Menunggu persetujuan koneksi wallet…" });
    try {
      const accounts = await provider.send("eth_requestAccounts", []) as string[];
      if (!accounts.length) throw new Error("Koneksi wallet tidak memberikan akun.");
      const network = await provider.getNetwork();
      setAccount(accounts[0]);
      setWalletChain(network.chainId);
      setNotice({ kind: "success", text: `Wallet tersambung: ${shortAddress(accounts[0])}.` });
      await updateSupply(provider);
    } catch (error) {
      const walletError = error as { message?: string };
      setNotice({ kind: "error", text: wasRejected(error) ? "Permintaan koneksi ditolak di wallet." : walletError.message || "Wallet gagal tersambung." });
    } finally {
      setBusy(null);
    }
  };

  const startMint = async (kind: MintKind) => {
    if (!LIVE_READY || !CONTRACT_ADDRESS || TARGET_CHAIN === null) {
      setNotice({ kind: "error", text: "Mint langsung belum aktif: gunakan kontrak BSC Mainnet chain ID 56 yang sudah di-deploy." });
      return;
    }
    const provider = getInjectedProvider();
    if (!provider) {
      setNotice({ kind: "error", text: "Wallet EVM tidak ditemukan. Pasang wallet kompatibel untuk menandatangani mint." });
      return;
    }
    const remaining = kind === "free" ? freeRemaining : paidRemaining;
    if (quantity > remaining) {
      setNotice({ kind: "error", text: `Alokasi ${kind === "free" ? "freemint" : "paid mint"} hanya tersisa ${formatCount(remaining)} NFT.` });
      return;
    }
    setBusy(kind);
    setNotice({ kind: "info", text: "Menyiapkan transaksi. Periksa detail dan setujui di wallet…" });
    try {
      const accounts = await provider.send("eth_requestAccounts", []) as string[];
      if (!accounts.length) throw new Error("Hubungkan wallet terlebih dahulu.");
      let network = await provider.getNetwork();
      if (network.chainId !== TARGET_CHAIN) {
        try {
          await window.ethereum!.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${TARGET_CHAIN.toString(16)}` }] });
        } catch (switchError) {
          const switchCode = (switchError as { code?: number }).code;
          if (switchCode !== 4902 || !BNB_CHAIN_CONFIG) throw switchError;
          await window.ethereum!.request({ method: "wallet_addEthereumChain", params: [BNB_CHAIN_CONFIG] });
        }
        network = await provider.getNetwork();
      }
      if (network.chainId !== TARGET_CHAIN) throw new Error(`Pilih ${CHAIN_NAME} (chain ID 56) di wallet lalu coba lagi.`);
      setAccount(accounts[0]);
      setWalletChain(network.chainId);
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const unitPrice = parseEther(kind === "free" ? FREE_FEE : PAID_PRICE);
      const value = unitPrice * BigInt(quantity);
      const tx = kind === "free"
        ? await contract.mintFree(quantity, { value })
        : await contract.mintPaid(quantity, { value });
      setNotice({ kind: "info", text: `Transaksi dikirim (${shortAddress(tx.hash)}). Menunggu konfirmasi jaringan…`, tx: tx.hash });
      await tx.wait(1);
      await updateSupply(provider);
      setNotice({ kind: "success", text: `${formatCount(quantity)} NFT ${kind === "free" ? "freemint" : "paid mint"} berhasil dibuat.`, tx: tx.hash });
    } catch (error) {
      const txError = error as { code?: number | string; shortMessage?: string; reason?: string; message?: string };
      if (wasRejected(error)) setNotice({ kind: "error", text: "Transaksi ditolak di wallet. Tidak ada mint yang diproses." });
      else if (txError.code === 4902) setNotice({ kind: "error", text: `Wallet belum mengenal ${CHAIN_NAME}. Tambahkan BSC Mainnet, lalu coba mint lagi.` });
      else setNotice({ kind: "error", text: txError.shortMessage || txError.reason || txError.message || "Mint gagal. Periksa jaringan dan saldo wallet." });
    } finally {
      setBusy(null);
    }
  };

  const copyPrompt = async (kind: MintKind) => {
    try {
      await navigator.clipboard.writeText(createAgentPrompt(kind, quantity));
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => current === kind ? null : current), 2200);
      setNotice({ kind: "success", text: `Prompt ${kind === "free" ? "freemint" : "paid mint"} tersalin. Tempel di agent AI wallet pilihan Anda.` });
    } catch {
      setNotice({ kind: "error", text: "Clipboard tidak tersedia. Pilih dan salin prompt yang tampil di bawah." });
      setPromptOpen(kind);
    }
  };

  const freePercent = supplyIsLive ? Math.min(100, (supply.free / ALLOCATION) * 100) : 0;
  const paidPercent = supplyIsLive ? Math.min(100, (supply.paid / ALLOCATION) * 100) : 0;
  const contractDisplay = useMemo(() => CONTRACT_ADDRESS ? shortAddress(CONTRACT_ADDRESS) : "BELUM DIPASANG", []);

  return (
    <div className="site-shell" id="top">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="craftmeetcode beranda">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span>
          <span className="brand-word">craftmeet<span>code</span><small>GENESIS STUDIO</small></span>
        </a>
        <button className="mobile-menu-toggle" aria-label={menuOpen ? "Tutup menu" : "Buka menu"} onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={20} /> : <ChevronDown size={20} />}
        </button>
        <nav className={`main-nav${menuOpen ? " is-open" : ""}`} aria-label="Navigasi utama">
          <a href="#collection" onClick={() => setMenuOpen(false)}>Koleksi <span>01</span></a>
          <a href="#mint" onClick={() => setMenuOpen(false)}>Mint <span>02</span></a>
          <a href="#agent" onClick={() => setMenuOpen(false)}>Agent AI <span>03</span></a>
          <a href="#about" onClick={() => setMenuOpen(false)}>Tentang <span>04</span></a>
        </nav>
        <button className={`wallet-button${account ? " is-connected" : ""}`} onClick={connectWallet} disabled={busy === "connect"}>
          {account ? <Check size={15} /> : <Wallet size={15} />}
          <span>{busy === "connect" ? "Menghubungkan…" : account ? shortAddress(account) : "Connect wallet"}</span>
          {account && <span className="connection-pip" />}
        </button>
      </header>

      <main>
        <section className="hero" id="collection">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> GENERATIVE COLLECTION <span className="eyebrow-id">№ 001</span></div>
            <h1>Where <em>craft</em><br />meets code<span className="title-period">.</span></h1>
            <p className="hero-deck">Karya pixel generatif, lahir dari baris kode.<br className="desktop-break" /> Setiap NFT punya kombinasi warna dan gaya yang berbeda, dibuat on-chain.</p>
            <div className="hero-actions">
              <a className="button-primary" href="#mint">Mulai mint <ArrowRight size={16} /></a>
              <a className="button-text" href="#about">Kenali koleksi <ArrowDownRight size={16} /></a>
            </div>
            <div className="hero-edition"><span className="status-dot" /> EDITION 001 <span className="edition-separator">/</span> 10,000 TOTAL WORKS</div>
          </div>
          <div className="hero-art-wrap">
            <div className="hero-art-frame">
              <img className="hero-art" src="/craftmeetcode-genesis.png" alt="NFT craftmeetcode Genesis #0001: laptop pixel-art bercahaya emas di atas latar hitam" />
              <div className="art-vignette" />
              <div className="art-index"><span>ART DIRECTION</span><strong>GENESIS</strong></div>
              <div className="art-caption"><span className="caption-square" /> 8 PALETTES · 4 ON-CHAIN STYLES</div>
            </div>
            <div className="art-side-note">COLLECT<br />THE<br />PROCESS <ArrowUpRight size={15} /></div>
          </div>
          <div className="hero-bottomline"><span>BUILT BY IMAGINATION</span><span>SEALED ONCHAIN</span><span>MADE TO BE REMIXED</span></div>
        </section>

        <section className="collection-strip" aria-label="Statistik koleksi">
          <div className="strip-intro"><span>THE COLLECTION</span><strong>01 / 04</strong></div>
          <div className="strip-stat"><strong>10,000</strong><span>TOTAL SUPPLY</span></div>
          <div className="strip-stat"><strong>5,000</strong><span>FREEMINT ALLOCATION</span></div>
          <div className="strip-stat"><strong>5,000</strong><span>PAID MINT ALLOCATION</span></div>
          <div className="strip-status"><span className={`status-dot${supplyIsLive ? " live" : ""}`} /> {supplyIsLive ? "SUPPLY LIVE" : "CONTRACT CONFIG REQUIRED"}</div>
        </section>

        <section className="supply-section" aria-labelledby="supply-title">
          <div className="section-kicker"><span>LIVE EDITION TRACKER</span><span>01 — SUPPLY</span></div>
          <div className="supply-heading">
            <h2 id="supply-title">Small supply.<br /><em>Room to make.</em></h2>
            <p>Separuh untuk yang ingin mencoba. Separuh untuk yang siap mengoleksi. Setiap alokasi punya jalur mint dan prompt agent AI sendiri.</p>
          </div>
          <div className="supply-panel">
            <div className="supply-total"><div><span className="metric-label">TOTAL MINTED</span><strong>{supplyIsLive ? formatCount(totalMinted) : "—"}<small> / 10,000</small></strong></div><span className="supply-live-tag"><i /> {supplyIsLive ? "LIVE FROM CONTRACT" : "MENUNGGU KONTRAK"}</span></div>
            <div className="supply-bar" aria-label="Progres supply mint"><div style={{ width: `${(freePercent + paidPercent) / 2}%` }} /><span /></div>
            <div className="supply-allocations">
              <div><span className="alloc-dot gold" /><span>Freemint</span><strong>{supplyIsLive ? `${formatCount(freeRemaining)} tersisa` : "5,000 tersedia"}</strong></div>
              <div><span className="alloc-dot cream" /><span>Paid mint</span><strong>{supplyIsLive ? `${formatCount(paidRemaining)} tersisa` : "5,000 tersedia"}</strong></div>
            </div>
            {!supplyIsLive && <p className="supply-footnote">Indikator jumlah akan membaca data blockchain setelah alamat kontrak dikonfigurasi.</p>}
          </div>
        </section>

        <section className="mint-section" id="mint" aria-labelledby="mint-title">
          <div className="section-kicker"><span>CHOOSE YOUR ENTRY</span><span>02 — MINT</span></div>
          <div className="mint-section-heading">
            <div><h2 id="mint-title">Two doors.<br /><em>Same universe.</em></h2></div>
            <p>Pilih cara masuk. Sambungkan wallet untuk menandatangani langsung, atau salin prompt spesifik dan minta agent AI pilihan Anda menyiapkannya.</p>
          </div>
          {account && LIVE_READY && !chainMatches && TARGET_CHAIN !== null && <div className="network-warning" role="alert"><CircleAlert size={16} /><span><strong>Wallet berada di jaringan lain.</strong> Mint memerlukan {CHAIN_NAME || "jaringan yang dikonfigurasi"} (chain ID {TARGET_CHAIN.toString()}). Pilih “Ganti jaringan &amp; mint” untuk meminta wallet berpindah atau menambahkan jaringan sebelum transaksi.</span></div>}
          <div className="mint-grid">
            <MintCard kind="free" account={account} quantity={quantity} setQuantity={setQuantity} remaining={freeRemaining} disabled={!LIVE_READY || !account} networkMismatch={Boolean(account && !chainMatches)} busy={busy} copied={copied === "free"} promptOpen={promptOpen === "free"} setPromptOpen={setPromptOpen} onMint={startMint} onCopy={copyPrompt} />
            <MintCard kind="paid" account={account} quantity={quantity} setQuantity={setQuantity} remaining={paidRemaining} disabled={!LIVE_READY || !account} networkMismatch={Boolean(account && !chainMatches)} busy={busy} copied={copied === "paid"} promptOpen={promptOpen === "paid"} setPromptOpen={setPromptOpen} onMint={startMint} onCopy={copyPrompt} />
          </div>
          <div className="mint-bottom-note"><LockKeyhole size={14} /><span>{account ? `Wallet ${shortAddress(account)} · ${CHAIN_NAME || "chain"} ${walletChain?.toString() ?? "—"}. ` : "Wallet Anda menandatangani transaksi. "}{treasuryAddress ? `Dana mint diteruskan kontrak ke treasury ${shortAddress(treasuryAddress)}.` : "Alamat penerima dibaca dari kontrak setelah deployment."} Agent AI tidak meminta private key.</span><a href="#agent">Cara kerja agent <ArrowUpRight size={13} /></a></div>
        </section>

        {notice && <div className={`notice notice-${notice.kind}`} role="status" aria-live="polite">
          {notice.kind === "success" ? <Check size={17} /> : notice.kind === "error" ? <CircleAlert size={17} /> : <span className="notice-spinner" />}
          <span>{notice.text}{notice.tx && EXPLORER_URL && <a className="tx-link" href={`${EXPLORER_URL}/tx/${notice.tx}`} target="_blank" rel="noreferrer">Lihat transaksi <ExternalLink size={12} /></a>}</span>
          <button aria-label="Tutup notifikasi" onClick={() => setNotice(null)}><X size={15} /></button>
        </div>}

        <section className="agent-section" id="agent" aria-labelledby="agent-title">
          <div className="agent-visual" aria-hidden="true">
            <div className="terminal-window"><div className="terminal-chrome"><span /><span /><span /><b>AGENT / 01</b></div><div className="terminal-body"><div className="terminal-line"><i>01</i><code><span>const</span> intention = <em>"make"</em>;</code></div><div className="terminal-line"><i>02</i><code><span>await</span> wallet.<em>review</em>(intention);</code></div><div className="terminal-line"><i>03</i><code><span>if</span> (you.approve) {'{'}</code></div><div className="terminal-line indent"><i>04</i><code>agent.<em>prepareMint</em>();</code></div><div className="terminal-line"><i>05</i><code>{'}'}</code></div><div className="terminal-cursor" /></div></div>
            <div className="pixel-orbit orbit-one" /><div className="pixel-orbit orbit-two" /><span className="visual-coord">0x43 · CRAFT / CODE</span>
          </div>
          <div className="agent-copy">
            <div className="section-kicker"><span>YOUR CO-PILOT, YOUR CALL</span><span>03 — AGENT</span></div>
            <span className="agent-mark"><Sparkles size={15} /> AGENT-READY PROMPTS</span>
            <h2 id="agent-title">Let your agent<br /><em>handle the setup.</em></h2>
            <p>Setiap mint punya prompt berbeda. Tempel prompt di AI agent yang terhubung ke wallet Anda; agent memeriksa kontrak dan menyiapkan transaksi untuk Anda tinjau.</p>
            <ol className="agent-steps">
              <li><span>01</span><p><strong>Pilih alokasi</strong><br />Freemint atau paid mint.</p></li>
              <li><span>02</span><p><strong>Salin prompt khusus</strong><br />Instruksi fungsi dan nilai sudah disiapkan.</p></li>
              <li><span>03</span><p><strong>Tinjau di wallet Anda</strong><br />Agent tidak pernah memegang private key.</p></li>
            </ol>
            <a className="button-text agent-link" href="#mint">Lihat dua prompt <ArrowRight size={15} /></a>
          </div>
        </section>

        <section className="about-section" id="about" aria-labelledby="about-title">
          <div className="about-head"><div className="section-kicker"><span>THE IDEA</span><span>04 — ABOUT</span></div><h2 id="about-title">A pixel is a beginning.<br /><em>Code gives it a world.</em></h2></div>
          <div className="about-body"><p>craftmeetcode adalah edisi karya generatif di persimpangan craft dan teknologi. Setiap karya berangkat dari bahasa visual pixel yang sederhana, lalu dibentuk oleh logika program.</p><div className="about-principle"><span>01</span><p><strong>Made with intention.</strong><br />Bukan deretan gambar acak. Setiap detail punya bahasa.</p></div><div className="about-principle"><span>02</span><p><strong>Open by design.</strong><br />Koleksi dan aturan mint dapat diverifikasi on-chain.</p></div><div className="about-principle"><span>03</span><p><strong>Yours to build on.</strong><br />Koleksi ini ruang awal untuk komunitas kreator.</p></div></div>
        </section>

        <section className="footer-cta"><div className="footer-pixel" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><div><span className="section-kicker">THE FIRST PIXEL IS YOURS</span><h2>Start with an idea.<br /><em>Leave with a piece.</em></h2></div><a className="button-primary" href="#mint">Pilih cara mint <ArrowRight size={16} /></a></section>
      </main>

      <footer className="site-footer">
        <a className="brand footer-brand" href="#top"><span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span><span className="brand-word">craftmeet<span>code</span><small>GENESIS STUDIO</small></span></a>
        <span className="footer-copyright">CRAFTED IN CODE · EDITION 001 · 2026</span>
        <div className="footer-contract"><span>CONTRACT</span><strong>{contractDisplay}</strong><a href="#mint" aria-label="Lihat detail konfigurasi kontrak"><ArrowUpRight size={14} /></a></div>
      </footer>
    </div>
  );
}

type MintCardProps = {
  kind: MintKind;
  account: string;
  quantity: number;
  setQuantity: (count: number) => void;
  remaining: number;
  disabled: boolean;
  networkMismatch: boolean;
  busy: MintKind | "connect" | null;
  copied: boolean;
  promptOpen: boolean;
  setPromptOpen: (kind: MintKind | null) => void;
  onMint: (kind: MintKind) => void;
  onCopy: (kind: MintKind) => void;
};

function MintCard(props: MintCardProps) {
  const { kind, account, quantity, setQuantity, remaining, disabled, networkMismatch, busy, copied, promptOpen, setPromptOpen, onMint, onCopy } = props;
  const free = kind === "free";
  const price = free ? FREE_FEE : PAID_PRICE;
  const prompt = createAgentPrompt(kind, quantity);
  const maxQuantity = Math.max(1, Math.min(20, remaining));
  return (
    <article className={`mint-card ${free ? "free-card" : "paid-card"}`}>
      <div className="card-topline"><span>{free ? "ALLOCATION 01" : "ALLOCATION 02"}</span><span>{free ? "5,000 PIECES" : "5,000 PIECES"}</span></div>
      <div className="card-heading-row"><div><div className="card-icon">{free ? <Sparkles size={19} /> : <Layers3 size={19} />}</div><h3>{free ? "Freemint" : "Paid mint"}</h3></div><span className="card-number">{free ? "01" : "02"}</span></div>
      <p className="card-description">{free ? "Ambil karya pertamamu. Biaya mint diteruskan langsung ke treasury proyek." : "Dukung generasi karya berikutnya dan tambahkan satu piece ke koleksimu."}</p>
      <div className="price-line"><div><strong>{price}</strong><span>{NATIVE_SYMBOL} <small>{free ? "/ NFT · fee ke treasury" : "/ NFT · harga mint"}</small></span></div><span className="gas-note">GAS NETWORK TERPISAH</span></div>
      <div className="card-divider" />
      <div className="quantity-row"><div><span>JUMLAH MINT</span><strong>{remaining.toLocaleString("id-ID")} tersisa</strong></div><div className="quantity-control"><button aria-label="Kurangi jumlah" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}><Minus size={14} /></button><span>{quantity.toString().padStart(2, "0")}</span><button aria-label="Tambah jumlah" onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))} disabled={quantity >= maxQuantity}><Plus size={14} /></button></div></div>
      <div className="card-total"><span>{free ? "TOTAL FEE" : "TOTAL MINT PRICE"}</span><strong>{(Number(price) * quantity).toFixed(free ? 4 : 3)} {NATIVE_SYMBOL}</strong></div>
      <button className={`mint-submit ${free ? "submit-free" : "submit-paid"}`} disabled={disabled || remaining < 1 || busy !== null} onClick={() => onMint(kind)}>
        <Wallet size={16} />{busy === kind ? "Menunggu konfirmasi…" : !account ? "Sambungkan wallet" : remaining < 1 ? "Alokasi habis" : !LIVE_READY ? "Kontrak belum aktif" : networkMismatch ? "Ganti jaringan & mint" : "Mint lewat wallet"}<ArrowRight size={16} />
      </button>
      <button className="agent-prompt-toggle" onClick={() => setPromptOpen(promptOpen ? null : kind)} aria-expanded={promptOpen}>
        <Code2 size={15} /><span>{promptOpen ? "Sembunyikan prompt agent" : "Atau mint lewat agent AI"}</span><ChevronDown size={15} className={promptOpen ? "rotate" : ""} />
      </button>
      {promptOpen && <div className="prompt-box"><div className="prompt-box-head"><span>AGENT PROMPT · {free ? "FREEMINT" : "PAID MINT"}</span><button onClick={() => onCopy(kind)}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? "TERSALIN" : "SALIN"}</button></div><pre>{prompt}</pre><p><LockKeyhole size={12} />Tinjau setiap transaksi di wallet. Jangan berikan secret key ke agent.</p></div>}
      <div className="allocation-progress"><span>{free ? "FREEMINT POOL" : "PAID POOL"}</span><span>{remaining.toLocaleString("id-ID")} / 5,000</span><div><i style={{ width: `${Math.max(0, Math.min(100, ((ALLOCATION - remaining) / ALLOCATION) * 100))}%` }} /></div></div>
    </article>
  );
}
