# Crafstak

# craftmeetcode

Landing page dan smart contract ERC-721 untuk koleksi 10.000 NFT di BSC Mainnet: 5.000 freemint dengan fee 0.0001 BNB per NFT dan 5.000 paid mint seharga 0.001 BNB per NFT. Semua pembayaran diteruskan kontrak ke alamat treasury yang ditentukan saat deployment.

## Menjalankan situs

1. Instal Node.js LTS dan jalankan `npm install`.
2. Salin `.env.example` menjadi `.env`.
3. Jalankan `npm run dev` untuk preview lokal. Mint langsung tetap nonaktif sampai `VITE_CONTRACT_ADDRESS` diisi dengan alamat kontrak yang sudah ter-deploy di BSC Mainnet.

Frontend default menargetkan BSC Mainnet (chain ID 56), menampilkan harga dalam BNB, dan dapat meminta wallet EVM menambahkan atau berpindah ke jaringan tersebut. Transaksi harus disetujui di wallet. Jangan letakkan secret pada variabel berawalan `VITE_`.

## Deploy ke BNB Mainnet

Ikuti [panduan deploy BNB Mainnet](BNB-DEPLOY.md) untuk mengisi RPC dan treasury, menjalankan tes lokal, dan deploy. Hanya perintah `npm run contract:deploy:bnb:mainnet` yang tersedia. Skrip memeriksa chain ID, treasury on-chain, serta mewajibkan konfirmasi mainnet.

`TREASURY_WALLET` adalah alamat publik penerima pembayaran. `DEPLOYER_PRIVATE_KEY` hanya digunakan Hardhat di mesin lokal; jangan kirim lewat chat atau agent, jangan beri awalan `VITE_`, dan jangan commit `.env`.

## Kontrak dan keamanan

- `mintFree(quantity)` menerima tepat 0.0001 BNB per NFT dan membatasi freemint maksimal 5.000.
- `mintPaid(quantity)` menerima tepat 0.001 BNB per NFT dan membatasi paid mint maksimal 5.000.
- Total supply dibatasi 10.000; gas BNB dibayar terpisah.
- Hanya owner yang dapat mengubah treasury. Metadata SVG dan JSON setiap token dibuat langsung on-chain dari token ID.
- `npm run contract:test` menjalankan enam unit test lokal Hardhat dan tidak menyentuh BNB Mainnet.

Kontrak belum diaudit profesional dan belum dideploy. Prompt agent AI untuk dua jalur mint tersedia di [PROMPTS.md](PROMPTS.md). Agent hanya menyiapkan transaksi; Anda tetap memeriksa serta menandatanganinya di wallet.

## Artwork generatif on-chain
Art referensi pengguna ditampilkan sebagai inspirasi visual di situs. Kontrak meng-generate SVG dan JSON metadata secara langsung untuk setiap token; setiap token ID memilih kombinasi warna dan gaya deterministik. Metadata tidak memerlukan CID, hosting eksternal, atau placeholder.
