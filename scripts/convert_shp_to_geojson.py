"""Convert the business shapefile from Israeli Grid to web GeoJSON.

The source is a point shapefile in EPSG:2039 (Israel 1993 / Israeli TM Grid).
MapLibre needs longitude/latitude (EPSG:4326). Geometry is not simplified
and no coordinates are invented: each output point is the shapefile point,
reprojected.

Usage (from the project folder):
  pip install pyshp pyproj
  python3 scripts/convert_shp_to_geojson.py
"""

from __future__ import annotations

import json
import zipfile
from pathlib import Path

import shapefile
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
ZIP_PATH = ROOT / "IndustryPoint_Eskhol (2).zip"
OUT_PATH = ROOT / "src" / "data" / "businesses.json"

# Shapefile field names are cut short by the old DBF limit.
# These are the full meanings, taken from the original table.
FIELDS = {
    "מזהה_": "id",
    "שם_הע": "name",
    "מרשם": "registry",
    "ותק__ש": "years",
    "מקור_": "identificationSource",
    "כתובת": "address",
    "רמת_מ": "locationPrecision",
    "יישוב": "settlement",
    "רשות": "authority",
    "מקור1": "addressSource",
    "ענף_פ": "activityBranch",
    "קבוצת": "foodGroup",
    "אתר_א": "website",
    "תיאור": "description",
    "מקור": "source",
}


def main() -> None:
    if not ZIP_PATH.exists():
        raise SystemExit(f"Missing source zip: {ZIP_PATH}")

    extract_dir = ROOT / "scripts" / ".shp"
    extract_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ZIP_PATH) as archive:
        archive.extractall(extract_dir)

    shp_path = next(extract_dir.glob("*.shp"))
    reader = shapefile.Reader(str(shp_path), encoding="utf-8")
    transformer = Transformer.from_crs("EPSG:2039", "EPSG:4326", always_xy=True)

    features = []
    for row in reader.iterShapeRecords():
        x, y = row.shape.points[0]
        lon, lat = transformer.transform(x, y)
        props: dict[str, object] = {}
        for src, dest in FIELDS.items():
            value = row.record[src]
            if dest == "years":
                props[dest] = None if value in (None, 0) else int(value)
            elif isinstance(value, str):
                props[dest] = value.strip()
            else:
                props[dest] = value
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [round(lon, 7), round(lat, 7)]},
                "properties": props,
            }
        )

    collection = {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(collection, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(features)} points to {OUT_PATH}")


if __name__ == "__main__":
    main()
