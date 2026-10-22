import tempfile
import unittest
from pathlib import Path

from godoy.clothing.exporter import export, plan_export


class ExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.source = self.base / "input"
        self.source.mkdir()

    def fixture(self, gender="male"):
        ped = "mp_m_freemode_01" if gender == "male" else "mp_f_freemode_01"
        collection = f"{ped}_demo"
        (self.source / f"{collection}.meta").write_text(
            f"<ShopPedApparel><pedName>{ped}</pedName><dlcName>{collection}</dlcName></ShopPedApparel>")
        for name in [f"{collection}.ymt", f"{collection}^jbib_000_u.ydd",
                     f"{collection}^jbib_diff_000_a_uni.ytd",
                     f"{collection}^jbib_diff_000_b_uni.ytd"]:
            (self.source / name).write_bytes(b"RSC7synthetic-test-only")
        return collection

    def test_package_both_genders_and_preserve_bytes(self):
        for gender in ["male", "female"]:
            with self.subTest(gender=gender):
                for item in self.source.iterdir():
                    item.unlink()
                collection = self.fixture(gender)
                plan = plan_export(self.source, "demo", gender)
                output = self.base / gender
                export(plan, output)
                for entry in plan.entries:
                    self.assertEqual(entry.source.read_bytes(), (output / entry.destination).read_bytes())
                manifest = (output / "fxmanifest.lua").read_text()
                self.assertIn("SHOP_PED_APPAREL_META_FILE", manifest)
                self.assertIn(collection + ".meta", manifest)
                self.assertEqual(len(list(output.rglob("*.ytd"))), 2)
                with self.assertRaises(ValueError):
                    export(plan, output)

    def test_missing_ymt(self):
        collection = self.fixture()
        (self.source / f"{collection}.ymt").unlink()
        with self.assertRaises(ValueError):
            plan_export(self.source, "demo", "male")

    def test_orphan_texture(self):
        collection = self.fixture()
        (self.source / f"{collection}^feet_diff_001_a_uni.ytd").write_bytes(b"RSC7test")
        with self.assertRaises(ValueError):
            plan_export(self.source, "demo", "male")

    def test_bad_pack_or_gender(self):
        for pack, gender in [("../escape", "male"), ("demo", "other")]:
            with self.assertRaises(ValueError):
                plan_export(self.source, pack, gender)

    def test_wrong_meta(self):
        collection = self.fixture()
        (self.source / f"{collection}.meta").write_text("<ShopPedApparel/>")
        with self.assertRaises(ValueError):
            plan_export(self.source, "demo", "male")

    def test_invalid_binary(self):
        collection = self.fixture()
        (self.source / f"{collection}.ymt").write_bytes(b"invalid")
        with self.assertRaises(ValueError):
            plan_export(self.source, "demo", "male")

    def test_copy_failure_leaves_no_partial_output(self):
        self.fixture()
        plan = plan_export(self.source, "demo", "male")
        plan.entries[-1].source.unlink()
        output = self.base / "failed"
        with self.assertRaises(OSError):
            export(plan, output)
        self.assertFalse(output.exists())
        self.assertFalse(list(self.base.glob(".godoy-*")))


if __name__ == "__main__":
    unittest.main()
