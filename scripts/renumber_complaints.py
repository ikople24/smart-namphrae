import csv
import sys
import os

def renumber_old_complaints(input_path: str, year: int, output_path: str | None = None):
    """
    แถว >= THRESHOLD จะถูกเปลี่ยนรหัสคำร้องจากรหัสสุ่มเดิม
    เป็น CMP-{year}0001, CMP-{year}0002, ... ไปเรื่อยๆ
    ตัวอย่าง: year=68 → CMP-680001, year=67 → CMP-670001
    """
    if output_path is None:
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_renumbered{ext}"

    with open(input_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        rows = list(reader)

    header = rows[0]
    data = rows[1:]

    SEQ_COL = 0
    CODE_COL = 1
    THRESHOLD = 96  # ลำดับ >= 96 คือรายการเก่า

    counter = 1
    changed = 0

    for row in data:
        try:
            seq = int(row[SEQ_COL])
        except (ValueError, IndexError):
            continue

        if seq >= THRESHOLD:
            new_code = f"CMP-{year:02d}{counter:04d}"
            old_code = row[CODE_COL]
            row[CODE_COL] = new_code
            print(f"  ลำดับ {seq}: {old_code} → {new_code}")
            counter += 1
            changed += 1

    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(data)

    print(f"\nเปลี่ยนรหัสแล้ว {changed} รายการ")
    print(f"บันทึกไฟล์ไปที่: {output_path}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="เปลี่ยนรหัสคำร้องเก่าใน CSV")
    parser.add_argument("input", help="ไฟล์ CSV ต้นฉบับ")
    parser.add_argument("--year", type=int, required=True, help="ปีงบประมาณ 2 หลัก เช่น 68 หรือ 67")
    parser.add_argument("--output", help="ไฟล์ CSV ผลลัพธ์ (default: <input>_renumbered.csv)")
    args = parser.parse_args()

    renumber_old_complaints(args.input, args.year, args.output)
