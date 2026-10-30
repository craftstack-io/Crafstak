# Deploy craftmeetcode ke BNB Mainnet

Proyek ini hanya menargetkan **BNB Smart Chain (BSC) Mainnet**: chain ID `56`, native coin `BNB`, RPC resmi `https://bsc-dataseed.bnbchain.org`, dan explorer `https://bscscan.com` [1] [2]. Tidak ada konfigurasi maupun perintah deploy BNB Testnet. Perintah `npm run contract:test` menjalankan unit test lokal Hardhat, bukan deployment atau transaksi Testnet.

Fee freemint `0.0001` dan harga paid mint `0.001` dihitung sebagai BNB. Literal Solidity `ether` menetapkan skala 10^18 base units; native coin di jaringan BSC Mainnet adalah BNB.

## Siapkan konfigurasi lokal

1. Jalankan `npm install`, lalu salin `.env.example` menjadi `.env`.
2. Isi `TREASURY_WALLET` dengan alamat publik wallet yang Anda kendalikan. Kontrak akan meneruskan pembayaran mint ke alamat ini.
3. Metadata NFT dan ilustrasi SVG dibuat on-chain; tidak perlu `PUBLIC_BASE_URI`, IPFS, atau hosting metadata eksternal. Setiap token menghasilkan kombinasi warna dan gaya berdasarkan token ID.
4. Siapkan wallet deployer terpisah yang memiliki BNB untuk gas. Simpan `DEPLOYER_PRIVATE_KEY` hanya di `.env` lokal. Jangan kirim private key atau seed phrase lewat chat/agent dan jangan commit `.env`.
5. Jalankan `npm run contract:compile` dan `npm run contract:test`. Tes ini berjalan lokal dan tidak mengirim transaksi ke BNB Chain.

Gunakan RPC resmi default atau endpoint tepercaya yang dapat Anda ganti lewat `BNB_MAINNET_RPC_URL`. Jangan masukkan RPC URL ber-token ke `VITE_RPC_URL`, sebab nilai berawalan `VITE_` masuk ke bundle browser. Endpoint publik BNB Chain memiliki rate limit; sejumlah endpoint mainnet juga menonaktifkan `eth_getLogs` [2]. Proyek ini tidak memakai `eth_getLogs`.

## Deployment Mainnet

Deployment membuat kontrak dan mengirim transaksi berbiaya BNB yang tidak dapat dibatalkan. Periksa alamat treasury, network, dan estimasi gas terlebih dahulu. Secara default, skrip berhenti kecuali `CONFIRM_MAINNET_DEPLOY=YES_I_UNDERSTAND_MAINNET_GAS` Anda isi sendiri dalam `.env` lokal.

Setelah mengisi semua nilai dan melakukan pemeriksaan final, jalankan:

```bash
npm run contract:deploy:bnb:mainnet
```

Skrip hanya mengizinkan network `bnbMainnet`, memeriksa bahwa RPC melaporkan chain ID 56, memvalidasi treasury dan setelah deploy memverifikasi alamat treasury pada kontrak. Jika RPC salah jaringan atau konfirmasi mainnet tidak diisi, proses berhenti.

Setelah deployment berhasil, skrip mencetak alamat kontrak, tautan explorer, dan pengaturan publik frontend. Salin nilai `VITE_` ke `.env`, lalu restart Vite atau build ulang situs. Jangan mengisi alamat kontrak hasil tebakan.

## Nilai mint dan supply

- `mintFree(quantity)` meneruskan tepat `0.0001 BNB × quantity` ke treasury; pool freemint maksimal 5.000 NFT.
- `mintPaid(quantity)` meneruskan tepat `0.001 BNB × quantity` ke treasury; pool paid mint maksimal 5.000 NFT.
- Total supply maksimal 10.000 NFT. Gas BSC dibayar terpisah oleh peminta transaksi.
- Fungsi admin `setTreasury` dapat mengubah penerima melalui owner kontrak. Periksa `treasury()` di explorer setelah deploy.

## Referensi

[1]: https://docs.bnbchain.org/bnb-smart-chain/developers/wallet-configuration/ "BNB Chain Wallet Configuration"
[2]: https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/ "BNB Chain JSON-RPC Endpoints"
