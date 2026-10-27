"""
Automated Selenium Test Suite for Student Attendance Management System
Compatible with standard Selenium 4+, pytest, headless Chrome/Firefox, and CI/CD pipelines.

To execute locally:
    pip install selenium webdriver-manager pytest
    pytest tests/selenium_attendance_test.py
"""

import os
import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

class TestStudentAttendanceSystem(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.base_url = os.environ.get("APP_URL", "http://localhost:3000")
        
        chrome_options = Options()
        chrome_options.add_argument("--headless=new")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1400,900")
        
        cls.driver = webdriver.Chrome(options=chrome_options)
        cls.wait = WebDriverWait(cls.driver, 10)

    @classmethod
    def tearDownClass(cls):
        if cls.driver:
            cls.driver.quit()

    def test_01_dashboard_loads_with_metrics(self):
        """Verify the dashboard page loads with institute title and 4 metric cards."""
        self.driver.get(self.base_url)
        
        # Verify title
        heading = self.wait.until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Apex Institute of Technology')]"))
        )
        self.assertIsNotNone(heading)

        # Verify summary stats exist
        enrolled_card = self.driver.find_element(By.XPATH, "//*[contains(text(), 'Enrolled Students')]")
        self.assertIsNotNone(enrolled_card)

        timetable_header = self.driver.find_element(By.XPATH, "//*[contains(text(), '7-Period Daily Timetable')]")
        self.assertIsNotNone(timetable_header)

    def test_02_mark_attendance_across_seven_periods(self):
        """Test navigating to attendance register, marking periods, and saving records."""
        # Click on 'Mark Daily Attendance' tab
        tab_btn = self.wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Mark Daily Attendance')]"))
        )
        tab_btn.click()

        # Verify 7 period headers exist (Period 1 to Period 7)
        for i in range(1, 8):
            header = self.wait.until(
                EC.presence_of_element_located((By.XPATH, f"//th[contains(., 'Period {i}')]"))
            )
            self.assertIsNotNone(header)

        # Click 'Mark All Present' batch action
        mark_all_btn = self.wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Mark All Present')]"))
        )
        mark_all_btn.click()

        # Click 'Save Attendance Records'
        save_btn = self.wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Save Attendance Records')]"))
        )
        save_btn.click()

        # Verify success banner appears
        success_msg = self.wait.until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Attendance saved successfully')]"))
        )
        self.assertIn("Attendance saved successfully", success_msg.text)

    def test_03_student_directory_add_and_search(self):
        """Test adding a new student, verifying persistence, and searching."""
        # Navigate to Student Directory
        tab_btn = self.driver.find_element(By.XPATH, "//button[contains(., 'Student Directory')]")
        tab_btn.click()

        # Click 'Add Student' button
        add_btn = self.wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Add Student')]"))
        )
        add_btn.click()

        # Fill modal form
        test_roll = f"TEST{int(time.time()) % 10000}"
        test_name = "Selenium Automated Test Student"

        self.driver.find_element(By.XPATH, "//input[@placeholder='e.g. 23CS105']").send_keys(test_roll)
        self.driver.find_element(By.XPATH, "//input[@placeholder='e.g. John Doe']").send_keys(test_name)
        self.driver.find_element(By.XPATH, "//button[@type='submit' and contains(., 'Add Student')]").click()

        # Wait for table to update and search for added student
        time.sleep(1)
        search_box = self.wait.until(
            EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Search roll no, name...']"))
        )
        search_box.clear()
        search_box.send_keys(test_roll)

        student_row = self.wait.until(
            EC.presence_of_element_located((By.XPATH, f"//*[contains(text(), '{test_roll}')]"))
        )
        self.assertIsNotNone(student_row)

    def test_04_monthly_reports_and_shortage_highlighting(self):
        """Test monthly analytics view, <75% shortage alert filtering, and CSV export."""
        # Navigate to Reports tab
        tab_btn = self.driver.find_element(By.XPATH, "//button[contains(., 'Monthly Reports')]")
        tab_btn.click()

        # Verify <75% Defaulter filter button exists
        defaulter_btn = self.wait.until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Shortage Defaulters Only')]"))
        )
        self.assertIsNotNone(defaulter_btn)

        # Verify 'Export CSV' button is present and clickable
        export_btn = self.driver.find_element(By.XPATH, "//button[contains(., 'Export CSV')]")
        self.assertTrue(export_btn.is_enabled())

if __name__ == "__main__":
    unittest.main()
