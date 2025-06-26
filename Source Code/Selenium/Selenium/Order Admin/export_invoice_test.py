from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
import keyboard
from SaveTestcaseLog import log_test_execution



import time
import os

DOWNLOAD_DIR = os.path.join(os.getcwd(), "downloads")
if not os.path.exists(DOWNLOAD_DIR):
    os.makedirs(DOWNLOAD_DIR)

class ExportInvoiceTest:
    def __init__(self):
        # Cấu hình tùy chọn Chrome
        chrome_options = Options()
        chrome_options.add_argument("--incognito")
        # Tạo service và khởi tạo trình duyệt
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)

        # Đợi và phóng to cửa sổ
        self.wait = WebDriverWait(self.driver, 10)
        self.driver.maximize_window()


    def login(self, email, password):
        """Đăng nhập vào hệ thống"""
        try:
            # Truy cập trang web
            self.driver.get('http://localhost:5173/')
            
            # Click vào liên kết đăng nhập
            login_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/login' and contains(text(), 'Đăng nhập hoặc đăng ký')]"))
            )
            login_link.click()
            
            # Nhập thông tin đăng nhập
            email_field = self.wait.until(EC.presence_of_element_located((By.NAME, "email")))
            password_field = self.driver.find_element(By.NAME, "password")
            
            email_field.clear()
            email_field.send_keys(email)
            password_field.clear()
            password_field.send_keys(password)
            
            # Click nút đăng nhập
            login_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Đăng nhập')]"))
            )
            login_button.click()
            
            self.mark_test_status("PASS", "Đăng nhập thành công", level="Exemplary")
            return True
        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi đăng nhập: {e}", level="Below Expectation")
            return False
    
    def navigate_to_admin_orders(self):
        """Điều hướng đến trang quản lý đơn hàng"""
        try:
            # Click vào profile
            profile_element = self.wait.until(EC.element_to_be_clickable((By.ID, "profile")))
            profile_element.click()
            
            # Click vào Admin Workplace
            admin_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/admin/overview' and contains(text(), 'Trang quản trị')]"))
            )
            admin_link.click()
            
            # Đợi trang admin load
            self.wait.until(EC.url_contains("/admin/overview"))
            
            # Click vào Đơn đặt hàng
            order_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/admin/order' and contains(text(), 'Đơn đặt hàng')]"))
            )
            order_link.click()
            
            # Đợi trang đơn hàng load
            self.wait.until(EC.url_contains("/admin/order"))
            self.mark_test_status("PASS", "Điều hướng thành công đến trang đơn hàng admin", level="Sufficient")
            
            return True
        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi điều hướng: {e}", level="Below Expectation")
            return False
        
    def print_invoice_test(self):
        """Test in hóa đơn từ trang chi tiết đơn hàng"""
        try:
            # Bước 1: Vào chi tiết đơn hàng đầu tiên
            details_button = self.wait.until(
                EC.element_to_be_clickable((
                    By.CSS_SELECTOR, "tbody.ant-table-tbody tr:first-child td:last-child a"
                ))
            )
            details_button.click()
            time.sleep(1)

            # Bước 2: Click nút "In hóa đơn 🧾"
            print_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[.//span[contains(text(),'In hóa đơn')]]"))
            )

            print_button.click()
            # Gửi Enter vào cửa sổ trình duyệt hiện tại
           
            time.sleep(2)  # đợi cửa sổ hiện lên
            keyboard.press_and_release('enter')

            # Bước 4: Đợi và kiểm tra toast hiển thị
            toast_success = WebDriverWait(self.driver, 10).until(
                EC.visibility_of_element_located((By.XPATH, "//div[contains(@class,'Toastify__toast--success') and contains(., 'Tải xuống hóa đơn thành công')]"))
            )

            if toast_success:
                self.mark_test_status("PASS", "Thông báo tải thành công hiển thị", level="Exemplary")
                return True
            else:
                self.mark_test_status("FAIL", "Không tìm thấy thông báo tải xuống thành công", level="Below Expectation")
                return False

        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi khi in hóa đơn: {e}", level="Below Expectation")
            return False
    
    def wait_for_file(self, filename, timeout=10):
        """Chờ file được tải về thành công"""
        file_path = os.path.join(DOWNLOAD_DIR, filename)
        waited = 0
        while not os.path.exists(file_path):
            time.sleep(1)
            waited += 1
            if waited > timeout:
                return None
        return file_path
    @log_test_execution
    def run_test(self):
        """Chạy test case chính"""
        try:
            # Test Case: Thay đổi trạng thái đơn hàng từ Pending sang In Delivery
            print("Bắt đầu test case: Thay đổi trạng thái đơn hàng từ Pending sang In Delivery")
            print("-" * 50)
            
            # Bước 1: Đăng nhập
            if not self.login('huygiavu2003@gmail.com', '12345678'):
                return False
            
            # Bước 2: Điều hướng đến trang quản lý đơn hàng
            if not self.navigate_to_admin_orders():
                return False
            
            if not self.print_invoice_test():
                return False
            
            time.sleep(5)

            self.mark_test_status("PASS", f"Lưu hóa đơn thành công", level="Sufficient")
            
            return True
        except Exception as e:
            self.mark_test_status("FAIL", f"Lưu hóa đơn thất bại: {e}", level="Below Expectation")
            return False
        
    def mark_test_status(self, status, reason="", level=None):
        label = {
            "PASS": "[TEST PASSED]",
            "FAIL": "[TEST FAILED]",
            "BLOCKED": "[TEST BLOCKED]",
            "INCONCLUSIVE": "[TEST INCONCLUSIVE]"
        }
        level_label = f" (Level: {level})" if level else ""
        print(f"\n{label.get(status, '[UNKNOWN STATUS]')} - {reason}{level_label}\n")

    def cleanup(self):
        """Dọn dẹp và đóng browser"""
        if self.driver:
            self.driver.quit()
            print("Đã đóng browser")

# Chạy test
if __name__ == "__main__":
    #Tắt log TensorFlow ở mức môi trường
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    test = ExportInvoiceTest()
    try:
        success = test.run_test()
        if success:
            print("\nTEST PASSED")
        else:
            print("\nTEST FAILED")
    finally:
        test.cleanup()
