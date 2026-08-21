#!/usr/bin/env python3
import sys, os, re, json
import pypdf

def parse_pdf_expenses(pdf_path):
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
        
        # Regex to find expense transaction blocks (DD/MM/YYYY or YYYY-MM-DD followed by time/description)
        pattern = re.compile(r'(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})\s*\n?\s*(\d{2}:\d{2})?\s*([\s\S]*?)(?=(\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})|\Z)')
        matches = pattern.findall(all_content)
        
        expense_list = []
        unique_raw_items = set()
        unique_suppliers = set()
        total_expense = 0.0
        
        for idx, m in enumerate(matches):
            raw_date = m[0]
            raw_time = m[1] if m[1] else "12:00"
            body = m[2].strip()
            
            # Format Date -> YYYY-MM-DD
            if '/' in raw_date:
                d_parts = raw_date.split('/')
                iso_date = f"{d_parts[2]}-{d_parts[1]}-{d_parts[0]}" if len(d_parts[2]) == 4 else f"{d_parts[0]}-{d_parts[1]}-{d_parts[2]}"
            else:
                iso_date = raw_date
                
            time_str = f"{raw_time}:00" if len(raw_time) == 5 else "12:00:00"
            
            # Extract Rp amounts
            rp_matches = re.findall(r'Rp\.\s*([\d\.,]+)|Rp\s*([\d\.,]+)|IDR\s*([\d\.,]+)', body, re.IGNORECASE)
            amount = 0.0
            if rp_matches:
                first_match = next((val for match_tuple in rp_matches for val in match_tuple if val), None)
                if first_match:
                    clean_str = first_match.replace('.', '').replace(',', '.')
                    try:
                        amount = float(clean_str)
                    except ValueError:
                        amount = 0.0
            
            if amount <= 0:
                num_matches = re.findall(r'(\d{1,3}(?:\.\d{3})+(?:,\d{2})?)', body)
                if num_matches:
                    clean_str = num_matches[-1].replace('.', '').replace(',', '.')
                    try:
                        amount = float(clean_str)
                    except ValueError:
                        amount = 0.0
            
            total_expense += amount
            
            # Extract Item / Expense Name and Supplier
            lines = [l.strip() for l in body.split('\n') if l.strip()]
            raw_item_str = ""
            supplier_str = "Supplier Umum / Pasar"
            outlet_str = "Semua Outlet"
            
            for line in lines:
                if any(kw in line.upper() for kw in ['AYAM PECAK', 'AYAM BAKAR', 'SURABAYA', 'PECEL LELE', 'KISARAN', 'TEBING', 'RANTAU']):
                    outlet_str = line
                elif any(kw in line.upper() for kw in ['TOKO', 'UD.', 'PT.', 'CV.', 'PASAR', 'AGEN', 'SUPPLIER']):
                    supplier_str = line
                    unique_suppliers.add(supplier_str)
                elif not any(char in line for char in ['Rp.', 'IDR', 'Total', 'Subtotal', 'Dibayar']) and len(line) > 2:
                    if not raw_item_str:
                        raw_item_str = line
            
            if not raw_item_str and len(lines) > 0:
                raw_item_str = lines[0]
            if not raw_item_str:
                raw_item_str = f"Pengeluaran Bahan / Biaya #{idx + 1}"
                
            sub_items = [i.strip() for i in raw_item_str.split(',') if i.strip()]
            for it in sub_items:
                clean_it = re.sub(r'^(Item|Produk|Bahan|Biaya|Ket|Deskripsi)\s*:\s*', '', it, flags=re.IGNORECASE).strip()
                if clean_it and not clean_it.startswith('Rp') and len(clean_it) > 1:
                    unique_raw_items.add(clean_it)
            
            receipt_id = f"EXP-PDF-{iso_date.replace('-', '')}-{idx + 1:04d}"
            expense_list.append({
                "id": receipt_id,
                "receipt_no": receipt_id,
                "date": iso_date,
                "time": time_str,
                "outlet_name": outlet_str,
                "supplier_name": supplier_str,
                "raw_item": raw_item_str,
                "raw_items": sub_items if sub_items else [raw_item_str],
                "amount": amount,
                "payment_method": "Cash / Kasir",
                "notes": f"Diimpor dari PDF Pengeluaran Halaman {idx + 1}"
            })
            
        dates = sorted([e["date"] for e in expense_list])
        date_start = dates[0] if dates else ""
        date_end = dates[-1] if dates else ""
        
        return {
            "success": True,
            "totalPages": total_pages,
            "totalCount": len(expense_list),
            "totalExpense": total_expense,
            "dateStart": date_start,
            "dateEnd": date_end,
            "suppliersDetected": list(unique_suppliers) if unique_suppliers else ["Supplier Umum / Pasar"],
            "uniqueRawItems": sorted(list(unique_raw_items)),
            "expenses": expense_list
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No PDF file provided"}))
        sys.exit(1)
        
    pdf_file = sys.argv[1]
    result = parse_pdf_expenses(pdf_file)
    print(json.dumps(result))
