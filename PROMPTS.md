# Prompt agent AI craftmeetcode — BSC Mainnet

Gunakan prompt ini hanya setelah kontrak benar-benar di-deploy di **BSC Mainnet, chain ID 56**. Isi semua placeholder dan pastikan alamat kontrak serta treasury cocok. Nilai mint memakai BNB. Jika chain ID bukan 56, alamat kontrak belum diverifikasi, atau treasury berbeda, hentikan proses. Agent hanya boleh menyiapkan transaksi melalui wallet yang saya kendalikan. Jangan pernah meminta seed phrase atau private key.

## Freemint — fee 0.0001 BNB per NFT

```text
Saya ingin mint {{JUMLAH}} NFT craftmeetcode dari alokasi FREEMINT di BSC Mainnet (chain ID 56).
Alamat kontrak: {{ALAMAT_KONTRAK}}
Penerima treasury yang saya harapkan: {{ALAMAT_TREASURY_SAYA}}

Sebelum menyiapkan transaksi, verifikasi bahwa wallet berada di chain ID 56 dan alamat kontrak adalah kontrak craftmeetcode yang benar di BSC Mainnet. Baca freeRemaining(), totalSupply(), FREE_MINT_FEE, dan treasury(). Jika sisa freemint kurang dari {{JUMLAH}}, atau treasury() berbeda dari alamat yang saya harapkan, berhenti dan jelaskan alasannya.

Jika semua cocok, siapkan hanya pemanggilan mintFree({{JUMLAH}}) dengan nilai tepat 0.0001 BNB × {{JUMLAH}}. Gas BNB jaringan dibayar terpisah. Tampilkan fungsi, jumlah NFT, nilai BNB, alamat kontrak, chain ID, dan treasury sebelum mengirim. Tunggu persetujuan saya di wallet sebelum mengirim transaksi. Jangan gunakan mintPaid. Jangan meminta atau membagikan private key atau seed phrase.
```

## Paid mint — 0.001 BNB per NFT

```text
Saya ingin mint {{JUMLAH}} NFT craftmeetcode dari alokasi PAID MINT di BSC Mainnet (chain ID 56).
Alamat kontrak: {{ALAMAT_KONTRAK}}
Penerima treasury yang saya harapkan: {{ALAMAT_TREASURY_SAYA}}

Sebelum menyiapkan transaksi, verifikasi bahwa wallet berada di chain ID 56 dan alamat kontrak adalah kontrak craftmeetcode yang benar di BSC Mainnet. Baca paidRemaining(), totalSupply(), PAID_MINT_PRICE, dan treasury(). Jika sisa paid mint kurang dari {{JUMLAH}}, atau treasury() berbeda dari alamat yang saya harapkan, berhenti dan jelaskan alasannya.

Jika semua cocok, siapkan hanya pemanggilan mintPaid({{JUMLAH}}) dengan nilai tepat 0.001 BNB × {{JUMLAH}}. Gas BNB jaringan dibayar terpisah. Tampilkan fungsi, jumlah NFT, nilai BNB, alamat kontrak, chain ID, dan treasury sebelum mengirim. Tunggu persetujuan saya di wallet sebelum mengirim transaksi. Jangan gunakan mintFree. Jangan meminta atau membagikan private key atau seed phrase.
```

Di halaman, jumlah pada prompt mengikuti angka yang dipilih di kartu mint. Isi seluruh placeholder dan periksa chain ID 56, kontrak, treasury, serta transaksi sebelum menandatangani.
