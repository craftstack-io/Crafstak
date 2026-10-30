# TODO craftmeetcode

## Situs dan mint — selesai
- [x] Buat landing page responsif bernama craftmeetcode dengan tema dark gold, ilustrasi pixel sederhana, serta nama situs dan logo/mark di kiri atas; gunakan nomio.uk sebagai arahan visual, bukan salinan.
- [x] Tampilkan total supply 10.000 NFT dengan dua alokasi: 5.000 freemint dan 5.000 paid mint.
- [x] Sediakan prompt agent AI berbeda untuk freemint dan paid mint; prompt dapat disalin, menggunakan fungsi/biaya yang sesuai, dan menunggu persetujuan wallet.
- [x] Sediakan koneksi wallet, status transaksi, jaringan BSC Mainnet, serta alur mint langsung dan agent.

## BNB Mainnet dan kontrak — selesai pada source
- [x] Targetkan hanya BSC Mainnet chain ID 56 dengan BNB sebagai native coin; jangan sediakan network atau perintah deploy BNB Testnet.
- [x] Pertahankan freemint 0.0001 BNB per NFT dan paid mint 0.001 BNB per NFT; kontrak meneruskan pembayaran ke wallet treasury.
- [x] Terapkan total supply 10.000 NFT dan batas terpisah masing-masing 5.000 untuk freemint serta paid mint.
- [x] Sediakan konfigurasi RPC, chain ID, dan explorer BSC Mainnet; sediakan perintah deploy khusus mainnet, validasi treasury/metadata, pemeriksaan chain ID 56, dan konfirmasi ekstra sebelum transaksi mainnet.
- [x] Sertakan file proyek, unit test lokal, prompt AI, contoh `.env`, dan panduan deploy. Jangan tanam alamat treasury atau private key yang belum diberikan.

**Status aktivasi:** source telah siap untuk deployment BSC Mainnet, tetapi kontrak belum dideploy. Deployment memerlukan alamat publik treasury, metadata yang tersedia, RPC, private key deployer lokal, BNB untuk gas, dan konfirmasi mainnet. Tidak ada transaksi Testnet yang digunakan.
