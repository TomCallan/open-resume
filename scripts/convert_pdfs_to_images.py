import fitz  # PyMuPDF
import os
import glob

pdf_dir = os.path.join(os.getcwd(), "public", "examples")
artifact_dir = "C:/Users/TomCa/.gemini/antigravity-cli/brain/ccca5c3c-84fa-45f9-87f7-ff0506916817/examples"
os.makedirs(artifact_dir, exist_ok=True)

pdf_files = glob.glob(os.path.join(pdf_dir, "*.pdf"))
print(f"Found {len(pdf_files)} PDF files to convert.")

for pdf_path in pdf_files:
    filename = os.path.basename(pdf_path)
    stem = os.path.splitext(filename)[0]
    out_png_path = os.path.join(pdf_dir, f"{stem}.png")
    out_artifact_path = os.path.join(artifact_dir, f"{stem}.png")

    doc = fitz.open(pdf_path)
    page = doc.load_page(0)
    # Render at 200 DPI for high quality preview
    pix = page.get_pixmap(dpi=200)
    pix.save(out_png_path)
    pix.save(out_artifact_path)
    print(f"Rendered: {stem}.png ({pix.width}x{pix.height})")

print("All PDFs converted to PNG images successfully.")
