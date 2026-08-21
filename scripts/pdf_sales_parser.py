#!/usr/bin/env python3
import sys, os, re, json
import pypdf

def parse_pdf(pdf_path):
    if not os.path.exists(pdf_path):
        return {"success": False, "error": f"File not found: {pdf_path}"}
        
    try:
        reader = pypdf.PdfReader(pdf_path)
        total_pages = len(reader.pages)
        
        full_text = []
        for p in reader.pages:
            t = p.extract_text()
            if t:
                full_text.append(t)
        all_content = '\n'.join(full_text)
        
        # Regex to find all transaction blocks: DD/MM/YYYY followed by HH:MM
        pattern = re.compile(r'(\d{2}/\d{2}/\d{4})\s*\n\s*(\d{2}:\d{2})\s*\n([\s\S]*?)(?=(\d{2}/\d{2}/\d{4}\s*\n\s*\d{2}:\d{2})|\Z)')
        matches = pattern.findall(all_content)
        
        tx_list = []
        unique_raw_items = set()
        
        for idx, m in enumerate(matches):
            raw_date = m[0]
            raw_time = m[1]
            body = m[2].strip()
            
            # Format Date DD/MM/YYYY -> YYYY-MM-DD
            d_parts = raw_date.split('/')
            iso_date = f"{d_parts[2]}-{d_parts[1]}-{d_parts[0]}"
            time_str = f"{raw_time}:00"
            
            # Extract Rp amounts
            rp_matches = re.findall(r'Rp\.\s*([\d\.,]+)', body)
            if len(rp_matches) >= 3:
                subtotal_str = rp_matches[0].replace('.', '').replace(',', '.')
                discount_str = rp_matches[1].replace('.', '').replace(',', '.')
                total_str = rp_matches[2].replace('.', '').replace(',', '.')
            elif len(rp_matches) >= 1:
                total_str = rp_matches[-1].replace('.', '').replace(',', '.')
                subtotal_str = total_str
                discount_str = '0'
            else:
                continue
                
            try:
                subtotal_val = float(subtotal_str)
                discount_val = float(discount_str)
                total_val = float(total_str)
            except Exception:
                continue
                
            # Clean headers and footers
            body_clean = re.sub(r'Tanggal\s+Outlet\s+Produk\s+Qty\s+Subtotal\s*Diskon\s*Per\s+Bill\s+Total\s+Dibayar', '', body)
            body_clean = re.sub(r'Penjualan\s*\n\s*\d{2}/\d{2}/\d{4}\s*-\s*\d{2}/\d{2}/\d{4}', '', body_clean)
            body_clean = re.sub(r'Diskon\s*Per\s+Bill\s+Total\s+Dibayar', '', body_clean)
            
            # Detect Outlet
            outlet_id = '1785369617361' # default Kisaran
            outlet_name = 'AYAM PECAK 2001 SEAFOOD - KISARAN'
            upper_body = body_clean.upper()
            if 'TEBING TINGGI' in upper_body:
                if 'SURABAYA' in upper_body:
                    outlet_id = '1785307180576'
                    outlet_name = 'AYAM BAKAR SURABAYA TEBING TINGGI'
                else:
                    outlet_id = '1785369561430'
                    outlet_name = 'AYAM PECAK 2001 SEAFOOD TEBING TINGGI'
            elif 'RANTAU' in upper_body:
                outlet_id = '1785537689430'
                outlet_name = 'AYAM PECAK 2001 SEAFOOD RANTAU PRAPAT'
            elif 'PAK HAJI' in upper_body or 'PECEL LELE PAK' in upper_body:
                outlet_id = '1785564003169'
                outlet_name = 'PECEL LELE PAK HAJI KISARAN'
                
            # Clean outlet name and amounts from product text
            prod_text = re.sub(r'AYAM\s+PECAK\s+2001\s*SEAFOOD\s*-\s*KISARAN', '', body_clean, flags=re.I)
            prod_text = re.sub(r'AYAM\s+PECAK\s+2001\s*SEAFOOD\s*TEBING\s*TINGGI', '', prod_text, flags=re.I)
            prod_text = re.sub(r'AYAM\s+BAKAR\s+SURABAYA\s*TEBING\s*TINGGI', '', prod_text, flags=re.I)
            prod_text = re.sub(r'AYAM\s+PECAK\s+2001', '', prod_text, flags=re.I)
            prod_text = re.sub(r'SEAFOOD\s*-\s*KISARAN', '', prod_text, flags=re.I)
            
            # Strip trailing amounts like: 8 Rp. 148.000,00 ...
            prod_text = re.sub(r'\d+\s*Rp\.[\s\S]*$', '', prod_text).strip()
            prod_text = ' '.join(prod_text.split())
            
            raw_items = [it.strip() for it in prod_text.split(',') if it.strip()]
            for it in raw_items:
                # Remove extra trailing spaces and clean up
                cleaned_it = re.sub(r'\s*/\s*DINE\s*IN', '', it, flags=re.I).strip()
                cleaned_it = re.sub(r'\s*/\s*TAKE\s*AWAY', '', cleaned_it, flags=re.I).strip()
                if cleaned_it:
                    unique_raw_items.add(cleaned_it)
                
            # Generate deterministic receipt ID
            receipt_id = f"TX-PDF-{iso_date.replace('-', '')}-{idx+1:04d}"
            
            tx_list.append({
                "id": receipt_id,
                "receipt_no": receipt_id,
                "date": iso_date,
                "time": time_str,
                "outlet_id": outlet_id,
                "outlet_name": outlet_name,
                "raw_products": prod_text,
                "raw_items": raw_items,
                "subtotal": subtotal_val,
                "discount": discount_val,
                "total": total_val,
                "amount": total_val,
                "paid_amount": total_val,
                "change_amount": 0,
                "payment_method": "Cash",
                "customer_name": "Pelanggan Umum",
                "status": "approved",
                "cashier": "Impor PDF"
            })
            
        total_omzet = sum(t["total"] for t in tx_list)
        dates = sorted(list(set(t["date"] for t in tx_list)))
        
        return {
            "success": True,
            "totalPages": total_pages,
            "totalCount": len(tx_list),
            "totalOmzet": total_omzet,
            "dateStart": dates[0] if dates else "",
            "dateEnd": dates[-1] if dates else "",
            "outletsDetected": list(set(t["outlet_name"] for t in tx_list)),
            "uniqueRawMenus": sorted(list(unique_raw_items)),
            "transactions": tx_list
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Usage: python pdf_sales_parser.py <path_to_pdf>"}))
        sys.exit(1)
        
    pdf_file = sys.argv[1]
    res = parse_pdf(pdf_file)
    print(json.dumps(res))
