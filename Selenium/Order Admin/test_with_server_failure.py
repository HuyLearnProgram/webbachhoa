from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
import os
from SaveTestcaseLog import log_test_execution
class ServerFailureTest:
    def __init__(self):
        chrome_options = Options()
        chrome_options.add_argument("--incognito")
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
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
    
    def change_order_status(self, from_status, to_status):
        """Thay đổi trạng thái đơn hàng"""
        try:
            # Đợi và tìm nút với trạng thái hiện tại
            status_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, f"//button[contains(@class, 'ant-btn') and contains(., '{from_status}')]"))
            )
            status_button.click()
            
            # Đợi dropdown xuất hiện và chọn trạng thái mới
            new_status_option = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, f"//li[contains(@class, 'ant-dropdown-menu-item') and .//span[contains(text(), '{to_status}')]]"))
            )
            new_status_option.click()
            
            return True
        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi khi đổi trạng thái đơn hàng: {e}", level="Below Expectation")
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
            
            # Bước 3: Đợi người test ngắt server trước khi đổi trạng thái
            print("\nĐÃ SẴN SÀNG CHUYỂN TRẠNG THÁI ĐƠN HÀNG.")
            print("Vui lòng NGẮT KẾT NỐI SERVER ngay bây giờ rồi ấn Enter để tiếp tục.")
            input("Ấn Enter sau khi đã ngắt server...")
            
            # Bước 4: Thử đổi trạng thái trong khi server đã tắt
            if not self.change_order_status('Pending', 'In Delivery'):
                return False
            time.sleep(5)
            try:    
                error_toast = self.wait.until(
                    EC.presence_of_element_located((By.CLASS_NAME, "Toastify__toast-body"))
                )
                toast_text = error_toast.text.strip().lower()
                if "cannot read properties" in toast_text or "có lỗi xảy ra" in toast_text:
                    self.mark_test_status("PASS", "Hiển thị lỗi toast đúng khi gặp lỗi hệ thống", level="Exemplary")
                    return True
                else:
                    self.mark_test_status("INCONCLUSIVE", f"Thông báo không đúng nội dung: {toast_text}", level="Developing")
            except:
                self.mark_test_status("FAIL", "Không thấy thông báo lỗi khi server bị ngắt", level="Below Expectation")
                return False

        except Exception as e:
            self.mark_test_status("FAIL", f"Exception khi chạy test: {e}", level="Below Expectation")
        return False
    
    def cleanup(self):
        """Dọn dẹp và đóng browser"""
        if self.driver:
            self.driver.quit()
            print("Đã đóng browser")

# Chạy test
if __name__ == "__main__":
    #Tắt log TensorFlow ở mức môi trường
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
    test = ServerFailureTest()
    try:
        success = test.run_test()
        if success:
            print("\nTEST PASSED")
        else:
            print("\nTEST FAILED")
    finally:
        test.cleanup()