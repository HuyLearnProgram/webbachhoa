from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
from SaveTestcaseLog import log_test_execution
class AdminOrderPageTest:
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
            print("Đã truy cập trang web thành công!")
            print(f"URL hiện tại: {self.driver.current_url}")
            print(f"Title trang: {self.driver.title}")
            
            # Đợi trang tải xong
            print("Đang đợi trang tải...")
            login_link = self.wait.until(
                EC.presence_of_element_located((By.XPATH, "//a[@href='/login' and contains(text(), 'Đăng nhập hoặc đăng ký')]"))
            )
            
            # Nhấn vào liên kết đăng nhập
            login_link.click()
            print("Đã nhấn vào liên kết Đăng nhập.")
            
            # Đợi trang đăng nhập tải
            print("Đang đợi trang đăng nhập...")
            email_field = self.wait.until(EC.presence_of_element_located((By.NAME, "email")))
            password_field = self.driver.find_element(By.NAME, "password")
            
            # Nhập thông tin đăng nhập
            email_field.clear()
            email_field.send_keys(email)
            password_field.clear()
            password_field.send_keys(password)
            print("Đã nhập thông tin đăng nhập.")
            
            # Đợi nút đăng nhập có thể click được và nhấn vào
            print("Đang đợi nút đăng nhập...")
            login_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Đăng nhập')]"))
            )
            login_button.click()
            print("Đã nhấn vào nút đăng nhập.")
            
            return True
        except Exception as e:
            print(f"Lỗi đăng nhập: {e}")
            return False
    
    def navigate_to_admin_orders(self):
        """Điều hướng đến trang quản lý đơn hàng"""
        try:
            # Đợi trang sau đăng nhập tải xong và phần tử "Tài khoản" xuất hiện
            print("Đang đợi phần tử Tài khoản...")
            profile_element = self.wait.until(EC.presence_of_element_located((By.ID, "profile")))
            
            # Nhấn vào phần tử "Tài khoản"
            profile_element.click()
            print("Đã nhấn vào phần tử Tài khoản.")
            
            # Đợi liên kết "Admin Workplace" xuất hiện và có thể click
            print("Đang đợi liên kết Admin Workplace...")
            admin_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/admin/overview' and contains(text(), 'Admin Workplace')]"))
            )
            
            # Nhấn vào liên kết "Admin Workplace"
            admin_link.click()
            print("Đã nhấn vào liên kết Admin Workplace.")
            
            # Đợi trang admin tải xong
            print("Đang đợi trang admin...")
            self.wait.until(EC.url_contains("/admin/overview"))
            print(f"Đã vào trang admin! URL hiện tại: {self.driver.current_url}")
            
            # Đợi liên kết "Đơn đặt hàng" xuất hiện và có thể click
            print("Đang đợi liên kết Đơn đặt hàng...")
            order_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/admin/order' and contains(text(), 'Đơn đặt hàng')]"))
            )
            
            # Nhấn vào liên kết "Đơn đặt hàng"
            order_link.click()
            print("Đã nhấn vào liên kết Đơn đặt hàng.")
            
            # Đợi trang đơn đặt hàng tải xong
            print("Đang đợi trang đơn đặt hàng...")
            self.wait.until(EC.url_contains("/admin/order"))
            print(f"Đã vào trang đơn đặt hàng! URL hiện tại: {self.driver.current_url}")
            
            return True
        except Exception as e:
            print(f"Lỗi điều hướng: {e}")
            return False
    @log_test_execution
    def run_test(self):
        """Chạy test case chính"""
        try:
            # Test Case: Truy cập trang quản lý đơn hàng
            print("Bắt đầu test case: Truy cập trang quản lý đơn hàng")
            # print("-" * 50)
            
            # Bước 1: Đăng nhập
            if not self.login('huygiavu2003@gmail.com', '12345678'):
                return False
            
            # Bước 2: Điều hướng đến trang quản lý đơn hàng
            if not self.navigate_to_admin_orders():
                return False
            
            # Đợi thêm 3 giây như trong code gốc
            time.sleep(10)
            
            print("-" * 50)
            print("Test case hoàn thành thành công!")
            return True
            
        except Exception as e:
            print(f"Lỗi trong quá trình test: {e}")
            return False
    
    def cleanup(self):
        """Dọn dẹp và đóng browser"""
        if self.driver:
            self.driver.quit()
            print("Đã đóng browser")

# Chạy test
if __name__ == "__main__":
    test = AdminOrderPageTest()
    try:
        success = test.run_test()
        if success:
            print("\nTEST PASSED")
        else:
            print("\nTEST FAILED")
    finally:
        test.cleanup()
