# Deployment Guide - GitHub Pages

## 🚀 Cara Deploy ke GitHub Pages

### 1. Commit & Push
```bash
git add .
git commit -m "Mobile-friendly improvements with cache busting"
git push origin main
```

### 2. Enable GitHub Pages
1. Buka repository: https://github.com/galihboy/ml-demo
2. Klik **Settings** → **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** / **root**
5. Klik **Save**

### 3. Tunggu Deployment
- GitHub Pages biasanya deploy dalam 1-5 menit
- Cek status di tab **Actions**
- URL akan tersedia di: https://galih.eu/ml-demo/

## 🔄 Cache Busting

### Masalah:
Browser dan GitHub Pages menyimpan cache CSS/JS lama, sehingga perubahan tidak terlihat.

### Solusi:
Tambahkan query string `?v=X` di semua link CSS dan JS:

```html
<!-- Sebelum -->
<link rel="stylesheet" href="../assets/css/unified-demo.css">
<script src="svm.js"></script>

<!-- Sesudah -->
<link rel="stylesheet" href="../assets/css/unified-demo.css?v=2">
<script src="svm.js?v=2"></script>
```

### Cara Update:
Setiap kali ada perubahan CSS/JS, increment versi:
- v=1 → v=2 → v=3 → dst.

## 📱 Testing di GitHub Pages

### Setelah Deploy:

1. **Clear Browser Cache:**
   - Chrome: Ctrl+Shift+Delete
   - Safari: Cmd+Option+E
   - Atau gunakan Incognito/Private mode

2. **Force Refresh:**
   - Windows: Ctrl+F5
   - Mac: Cmd+Shift+R

3. **Test di Real Device:**
   - Buka di smartphone
   - Test portrait & landscape
   - Test semua fitur

### URL untuk Testing:
- Index: https://galih.eu/ml-demo/
- SVM: https://galih.eu/ml-demo/supervised/svm.html
- KNN: https://galih.eu/ml-demo/supervised/knn.html
- Linear Regression: https://galih.eu/ml-demo/supervised/linear-regression.html
- Error Metrics: https://galih.eu/ml-demo/supervised/error-metrics.html

## 🐛 Troubleshooting

### Jika Masih Terlihat Lama:

**1. Hard Refresh di Browser:**
```
Chrome/Firefox: Ctrl+Shift+R
Safari: Cmd+Option+R
```

**2. Clear Site Data:**
- Chrome DevTools → Application → Clear Storage
- Centang semua → Clear site data

**3. Increment Version:**
```bash
# Ubah v=2 menjadi v=3 di semua file
# Commit & push lagi
```

**4. Wait for CDN:**
- GitHub Pages menggunakan CDN
- Bisa butuh 5-10 menit untuk propagate
- Coba lagi setelah beberapa menit

**5. Check GitHub Actions:**
- Buka tab Actions di repository
- Pastikan deployment success (✓)
- Jika failed (✗), cek error log

## 📋 Checklist Deployment

- [x] Semua file sudah di-commit
- [x] Cache busting (v=2) sudah ditambahkan
- [x] Push ke GitHub
- [ ] GitHub Pages enabled
- [ ] Wait 5 minutes
- [ ] Hard refresh browser
- [ ] Test di mobile device
- [ ] Verify responsive design

## 🎯 Expected Results

Setelah deployment berhasil:

### Desktop:
- ✅ Canvas ukuran penuh
- ✅ Sidebar di samping
- ✅ Semua kontrol visible

### Mobile (Portrait):
- ✅ Canvas di atas (60-70vh)
- ✅ Sidebar di bawah
- ✅ Touch interaction works
- ✅ No horizontal scroll

### Mobile (Landscape):
- ✅ Canvas maximize height (80vh)
- ✅ Compact controls
- ✅ Optimal viewing

## 💡 Tips

1. **Selalu gunakan Incognito** saat testing GitHub Pages
2. **Increment version** setiap kali update CSS/JS
3. **Test di real device**, bukan hanya DevTools
4. **Wait 5-10 minutes** setelah push untuk CDN update
5. **Check Actions tab** untuk memastikan deployment success

## 🔗 Custom Domain

Jika menggunakan custom domain (galih.eu):

1. **DNS Settings:**
   - A Record: 185.199.108.153
   - A Record: 185.199.109.153
   - A Record: 185.199.110.153
   - A Record: 185.199.111.153

2. **CNAME File:**
   - Buat file `CNAME` di root
   - Isi: `galih.eu`

3. **GitHub Settings:**
   - Settings → Pages → Custom domain
   - Masukkan: galih.eu/ml-demo
   - Enable HTTPS

## 📞 Support

Jika masih ada masalah:
1. Check browser console (F12) untuk error
2. Verify file paths benar
3. Check GitHub Actions log
4. Try different browser
5. Clear DNS cache: `ipconfig /flushdns` (Windows)
