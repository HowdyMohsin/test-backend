"""Dev helper: reset an admin user's password (local testing).

1. Copy into the running api container:
     docker compose cp reset_admin.py api:/code/reset_admin.py
2. Run it (password as 2nd arg = visible typing, no hidden prompt):
     docker compose exec api python /code/reset_admin.py you@email.com newpassword
   Or without the arg to be prompted (hidden) twice:
     docker compose exec api python /code/reset_admin.py you@email.com
"""
import asyncio
import getpass
import sys

from sqlalchemy import select

from app.api.admin.auth import hash_password
from app.db.models import AdminUser
from app.db.session import SessionFactory


async def main() -> None:
    email = (sys.argv[1] if len(sys.argv) > 1 else input("Email: ")).lower().strip()
    if len(sys.argv) > 2:
        pw1 = pw2 = sys.argv[2]
    else:
        pw1 = getpass.getpass("New password: ")
        pw2 = getpass.getpass("New password (dobara likho): ")
    if not pw1:
        print("khali password nahi chalega — kuch nahi badla")
        return
    if pw1 != pw2:
        print("dono password match nahi hue — kuch nahi badla")
        return
    async with SessionFactory() as s:
        async with s.begin():
            admin = (
                await s.execute(select(AdminUser).where(AdminUser.email == email))
            ).scalar_one_or_none()
            if admin is None:
                print(f"koi admin nahi mila is email se: {email}")
                return
            admin.password_hash = hash_password(pw1)
    print(f"password reset ho gaya: {email}")


asyncio.run(main())
