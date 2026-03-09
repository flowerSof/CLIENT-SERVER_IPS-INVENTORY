from sqlalchemy.orm import Session
from models import glossary

def parse_hostname_logic(hostname: str, db: Session):
    """
    Parses a hostname based on the fixed structure:
    0-2: Distrito (04)
    2-4: Sede (25)
    4-6: Piso (02)
    6-7: Tipo (L)
    7-11: OOJJ (03SC)
    11-13: Area (SA)
    13-15: Correlative (04)
    Total: 15 chars
    """
    if not hostname:
        return {"valid_format": False, "is_domain": False}

    hostname_clean = hostname.upper().replace("-", "").strip()
    
    if len(hostname_clean) != 15:
        return {
            "valid_format": False, 
            "error": f"Expected 15 characters, got {len(hostname_clean)}",
            "is_domain": False
        }

    parts = {
        "distrito_code": hostname_clean[0:2],
        "sede_code": hostname_clean[2:4],
        "piso_val": hostname_clean[4:6],
        "tipo_code": hostname_clean[6:7],
        "oojj_code": hostname_clean[7:11],
        "area_code": hostname_clean[11:13],
        "correlative": hostname_clean[13:15]
    }
    
    # Batch query or individual lookups. For simplicity/speed in this context, individual is okay,
    # but caching would be better. For now, Keep It Simple.
    
    def decode(cat, code):
        res = db.query(glossary.NamingConvention).filter(
            glossary.NamingConvention.category == cat, 
            glossary.NamingConvention.code == code
        ).first()
        return res.description if res else None

    decoded = {
        "distrito": decode("DISTRITO", parts["distrito_code"]),
        "sede": decode("SEDE", parts["sede_code"]),
        "tipo": decode("TIPO", parts["tipo_code"]),
        "oojj": decode("OOJJ", parts["oojj_code"]),
        "area": decode("AREA", parts["area_code"]),
    }
    
    # "Domain" logic: If critical parts are found in glossary, it's likely a domain machine.
    # Requirement: "si no coincida la estructura entonces seria no dominimio"
    # We interpret "structure" as "valid length AND valid codes".
    is_domain = all([
        decoded["distrito"], 
        decoded["sede"], 
        decoded["tipo"], 
        decoded["area"]
        # OOJJ might be more variable? Let's check strict for now as per "coincida la estructura"
    ])
    
    return {
        "valid_format": True,
        "parts": parts,
        "decoded": decoded,
        "is_domain": is_domain,
        "derived_area": decoded.get("oojj") # Now maps Area to OOJJ (Órgano Judicial) rather than the sub-area.
    }
