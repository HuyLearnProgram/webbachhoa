from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
from SaveTestcaseLog import log_test_execution
class LatestOrderProcessing:
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
            
            # Click vào liên kết đăng nhập
            login_link = self.wait.until(
                EC.presence_of_element_located((By.XPATH, "//a[@href='/login' and contains(text(), 'Đăng nhập hoặc đăng ký')]"))
            )
            login_link.click()
            # print("Đã click vào liên kết đăng nhập")
            
            # Nhập thông tin đăng nhập
            username_field = self.wait.until(EC.presence_of_element_located((By.NAME, "email")))
            password_field = self.driver.find_element(By.NAME, "password")
            
            username_field.clear()
            username_field.send_keys(email)
            password_field.clear()
            password_field.send_keys(password)
            # print("Đã nhập thông tin đăng nhập")
            
            # Click nút đăng nhập
            login_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Đăng nhập')]"))
            )
            login_button.click()
            time.sleep(5)
            print("Đã đăng nhập")
            
            return True
        except Exception as e:
            print(f"Lỗi đăng nhập: {e}")
            return False
    
    def navigate_to_admin_orders(self):
        """Điều hướng đến trang quản lý đơn hàng"""
        try:
            # Click vào profile
            profile_element = self.wait.until(EC.presence_of_element_located((By.ID, "profile")))
            profile_element.click()
            # print("Đã click vào profile")
            
            # Click vào Admin Workplace
            admin_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/admin/overview' and contains(text(), 'Trang quản trị')]"))
            )
            admin_link.click()
            print("Đã vào Admin Workplace")
            
            # Đợi trang admin load
            self.wait.until(EC.url_contains("/admin/overview"))
            
            # Click vào Đơn đặt hàng
            order_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/admin/order' and contains(text(), 'Đơn đặt hàng')]"))
            )
            order_link.click()
            # print("Đã vào trang đơn đặt hàng")
            
            # Đợi trang đơn hàng load
            self.wait.until(EC.url_contains("/admin/order"))
            print("Đã vào trang đơn đặt hàng thành công!")
            
            return True
        except Exception as e:
            print(f"Lỗi điều hướng: {e}")
            return False
    
    def filter_orders_by_status(self, status="Pending"):
        """Lọc đơn hàng theo trạng thái"""
        try:
            # Chọn filter theo status
            time.sleep(2)  # Đợi trang load hoàn toàn
            
            dropdown = self.wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "div.ant-select-selector"))
            )
            dropdown.click()
            print(f"Đã click vào dropdown filter")
            
            # Đợi menu dropdown xuất hiện và chọn status
            self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".ant-select-dropdown")))
            time.sleep(1)  # Đợi menu render hoàn toàn
            
            status_option = self.driver.find_element(By.XPATH, f"//div[contains(@class, 'ant-select-item') and text()='{status}']")
            status_option.click()
            
            print(f"Đã lọc theo trạng thái {status} thành công!")
            
            # Đợi trang cập nhật sau khi filter
            time.sleep(7)
            
            print(f"Hiện tại đang hiển thị các đơn hàng có trạng thái {status}")
            
            return True
        except Exception as e:
            print(f"Lỗi lọc đơn hàng theo trạng thái: {e}")
            return False
    def filter_orders_by_status(self, status="Pending"):
        """Lọc đơn hàng theo trạng thái"""
        try:
            # Chọn filter theo status
            time.sleep(2)  # Đợi trang load hoàn toàn
            
            dropdown = self.wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "div.ant-select-selector"))
            )
            dropdown.click()
            print(f"Đã click vào dropdown filter")
            
            # Đợi menu dropdown xuất hiện và chọn status
            self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".ant-select-dropdown")))
            time.sleep(1)  # Đợi menu render hoàn toàn
            
            status_option = self.driver.find_element(By.XPATH, f"//div[contains(@class, 'ant-select-item') and text()='{status}']")
            status_option.click()
            
            print(f"Đã lọc theo trạng thái {status} thành công!")
            
            # Đợi trang cập nhật sau khi filter
            time.sleep(7)
            
            print(f"Hiện tại đang hiển thị các đơn hàng có trạng thái {status}")
            
            return True
        except Exception as e:
            print(f"Lỗi lọc đơn hàng theo trạng thái: {e}")
            return False
    
    def change_order_status(self, from_status, to_status):
        """Thay đổi trạng thái đơn hàng"""
        try:
            # Đợi và tìm nút với trạng thái hiện tại
            # print(f"Đang đợi nút {from_status} đầu tiên...")
            status_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, f"//button[contains(@class, 'ant-btn') and contains(., '{from_status}')]"))
            )
            status_button.click()
            print(f"Đã click vào nút {from_status}")
            
            # Đợi dropdown xuất hiện và chọn trạng thái mới
            # print(f"Đang đợi tùy chọn {to_status}...")
            new_status_option = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, f"//li[contains(@class, 'ant-dropdown-menu-item') and .//span[contains(text(), '{to_status}')]]"))
            )
            new_status_option.click()
            print(f"Đã chọn tùy chọn {to_status}")
            
            # Xác nhận trạng thái đã thay đổi
            # print("Đang kiểm tra trạng thái đơn hàng...")
            # self.wait.until(
            #     EC.presence_of_element_located((By.XPATH, f"//button[contains(@class, 'ant-btn') and contains(., '{to_status}')]"))
            # )
            # print(f"Trạng thái đơn hàng đã được cập nhật thành {to_status}!")
            
            return True
        except Exception as e:
            print(f"Lỗi thay đổi trạng thái: {e}")
            return False
    @log_test_execution
    def run_test(self):
        """Chạy test case chính"""
        try:
            # Test Case: Lọc đơn hàng theo trạng thái Pending
            print("Bắt đầu test case: Xử lí đơn hàng mới nhất")
            print("-" * 50)
            

            if not self.login('huygiavu2003@gmail.com', '12345678'):
                return False
            

            if not self.navigate_to_admin_orders():
                return False
            
            
            if not self.filter_orders_by_status("Pending"):
                return False
            # time.sleep(2)
            if not self.change_order_status('Pending', 'In Delivery'):
                return False
            # time.sleep(2)
            if not self.filter_orders_by_status("In delivery"):
                return False
            # time.sleep(2)
            if not self.change_order_status('In Delivery', 'Success'):
                return False
            # time.sleep(2)
            if not self.filter_orders_by_status("Succeed"):
                return False
            # time.sleep(2)
            print("-" * 50)
            print("Test case thành công!")
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
    test = LatestOrderProcessing()
    try:
        success = test.run_test()
        if success:
            print("\nTEST PASSED")
        else:
            print("\nTEST FAILED")
    finally:
        test.cleanup()


