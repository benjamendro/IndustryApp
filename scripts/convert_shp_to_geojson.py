"""Convert the project shapefiles to web GeoJSON (longitude/latitude).

Sources, all in the project folder:

- ``IndustryPoint_Eskhol (2).zip`` — business points, Israeli Grid (EPSG:2039).
- ``Industry_Area_ (1).zip`` — zone polygons. The .prj says Web Mercator
  (EPSG:3857). The accompanying XML still mentions Israeli Grid and zero
  features; that metadata is stale and is not used.
- ``Industrial_areas_cat.zip`` — parcel polygons, also Web Mercator
  (EPSG:3857) according to the .prj.

Nothing is simplified and no shapes are moved. Each output coordinate is the
source coordinate transformed to EPSG:4326.

The parcel column named ``Dunam`` matches the polygon area in square meters
(Israel TM), not dunams. It is copied as ``areaSqm``. The app shows dunams
by dividing that number by 1,000.

Parcel id is ``אזור||מספר תכנית||מספר מגרש``. That trio is unique. The parcel
number alone is not.

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
DATA = ROOT / "src" / "data"

BUSINESS_ZIP = ROOT / "IndustryPoint_Eskhol (2).zip"
ZONE_ZIP = ROOT / "Industry_Area_ (1).zip"
PARCEL_ZIP = ROOT / "Industrial_areas_cat.zip"

BUSINESS_FIELDS = {
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


def extract(zip_path: Path, folder: Path) -> Path:
    if not zip_path.exists():
        raise SystemExit(f"Missing source zip: {zip_path}")
    folder.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(folder)
    return next(folder.glob("*.shp"))


def xy(point: tuple[float, ...]) -> tuple[float, float]:
    return float(point[0]), float(point[1])


def polygon_geometry(shape: shapefile.Shape, transformer: Transformer, decimals: int) -> dict:
    points = [xy(point) for point in shape.points]
    parts = list(shape.parts) + [len(points)]
    rings = []
    for start, end in zip(parts, parts[1:]):
        ring = []
        for x, y in points[start:end]:
            lon, lat = transformer.transform(x, y)
            ring.append([round(lon, decimals), round(lat, decimals)])
        if len(ring) >= 4:
            rings.append(ring)
    if not rings:
        raise SystemExit("A polygon had no ring")
    return {"type": "Polygon", "coordinates": rings}


def write(path: Path, features: list[dict]) -> None:
    collection = {
        "type": "FeatureCollection",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(collection, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(features)} features to {path}")


def text(value: object) -> str:
    if value is None:
        return ""
    return str(value).strip()


def convert_businesses() -> None:
    shp = extract(BUSINESS_ZIP, ROOT / "scripts" / ".shp" / "businesses")
    reader = shapefile.Reader(str(shp), encoding="utf-8")
    transformer = Transformer.from_crs("EPSG:2039", "EPSG:4326", always_xy=True)
    features = []
    for row in reader.iterShapeRecords():
        x, y = xy(row.shape.points[0])
        lon, lat = transformer.transform(x, y)
        props: dict[str, object] = {}
        for src, dest in BUSINESS_FIELDS.items():
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
    write(DATA / "businesses.json", features)


def convert_zones() -> None:
    shp = extract(ZONE_ZIP, ROOT / "scripts" / ".shp" / "zones")
    reader = shapefile.Reader(str(shp), encoding="utf-8")
    transformer = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
    features = []
    for row in reader.iterShapeRecords():
        features.append(
            {
                "type": "Feature",
                "geometry": polygon_geometry(row.shape, transformer, 6),
                "properties": {"name": text(row.record["NAME"])},
            }
        )
    write(DATA / "zones.json", features)


def convert_parcels() -> None:
    shp = extract(PARCEL_ZIP, ROOT / "scripts" / ".shp" / "parcels")
    reader = shapefile.Reader(str(shp), encoding="utf-8")
    transformer = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)
    features = []
    seen: set[str] = set()
    for row in reader.iterShapeRecords():
        zone = text(row.record["אזור"])
        plan = text(row.record["TOCHNIT"])
        number = text(row.record["MIGRASH"])
        parcel_id = f"{zone}||{plan}||{number}"
        if parcel_id in seen:
            raise SystemExit(f"Duplicate parcel id: {parcel_id}")
        seen.add(parcel_id)
        area = row.record["Dunam"]
        features.append(
            {
                "type": "Feature",
                "geometry": polygon_geometry(row.shape, transformer, 6),
                "properties": {
                    "id": parcel_id,
                    "zone": zone,
                    "plan": plan,
                    "planStatus": text(row.record["סטטוס"]),
                    "number": number,
                    "landUse": text(row.record["YEUD_MEFUR"]),
                    "landUseCategory": text(row.record["YEUD_CAT"]),
                    "surveyStatus": text(row.record["פנוי_"]),
                    "areaSqm": float(area) if area not in (None, "") else 0,
                },
            }
        )
    write(DATA / "parcels.json", features)


def main() -> None:
    convert_businesses()
    convert_zones()
    convert_parcels()


if __name__ == "__main__":
    main()
