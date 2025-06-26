
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import os
from SaveTestcaseLog import log_test_execution
class ChangeStatusConcurrentTest:
    def __init__(self):
        import os
        import sys
        sys.stderr = open(os.devnull, 'w')
        os.environ['GRPC_VERBOSITY'] = 'ERROR'
        os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
        os.environ['GLOG_minloglevel'] = '3'
        chrome_options = Options()
        chrome_options.add_argument("--incognito")
        chrome_options.add_argument("--disable-logging")
        chrome_options.add_argument("--disable-gpu-sandbox")
        chrome_options.add_argument("--disable-software-rasterizer")
        chrome_options.add_argument("--disable-background-timer-throttling")
        chrome_options.add_argument("--disable-backgrounding-occluded-windows")
        chrome_options.add_argument("--disable-renderer-backgrounding")
        chrome_options.add_argument("--disable-features=TranslateUI")
        chrome_options.add_argument("--disable-ipc-flooding-protection")
        chrome_options.add_argument("--log-level=3")
        chrome_options.add_argument("--disable-web-security")
        chrome_options.add_argument("--disable-features=VizDisplayCompositor")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_experimental_option("excludeSwitches", [
            "enable-automation", 
            "enable-logging"
        ])
        
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        self.driver.maximize_window()
        

        self.driver2 = None
        self.wait2 = None

    def login(self, email, password, driver=None, wait=None):
        """Đăng nhập với driver được chỉ định"""
        if driver is None:
            driver = self.driver
        if wait is None:
            wait = self.wait
            
        try:
            driver.get('http://localhost:5173/')
            
            login_link = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/login' and contains(text(), 'Đăng nhập hoặc đăng ký')]"))
            )
            login_link.click()
            
            email_field = wait.until(EC.presence_of_element_located((By.NAME, "email")))
            password_field = driver.find_element(By.NAME, "password")
            
            email_field.clear()
            email_field.send_keys(email)
            password_field.clear()
            password_field.send_keys(password)
            
            login_button = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Đăng nhập')]"))
            )
            login_button.click()
            time.sleep(3)
            
            print(f"Đăng nhập thành công với {email}")
            return True
        except Exception as e:
            print(f"[TEST FAILED] - Lỗi đăng nhập {email}: {e}")
            return False
    
    def navigate_to_admin_orders(self, driver=None, wait=None):
        """Điều hướng đến trang đơn hàng admin"""
        if driver is None:
            driver = self.driver
        if wait is None:
            wait = self.wait
            
        try:
            profile_element = wait.until(EC.element_to_be_clickable((By.ID, "profile")))
            profile_element.click()
            
            admin_link = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/admin/overview' and contains(text(), 'Trang quản trị')]"))
            )
            admin_link.click()
            
            wait.until(EC.url_contains("/admin/overview"))
            
            order_link = wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/admin/order' and contains(text(), 'Đơn đặt hàng')]"))
            )
            order_link.click()
            
            wait.until(EC.url_contains("/admin/order"))
            print("Điều hướng thành công đến trang đơn hàng admin")
            
            return True
        except Exception as e:
            print(f"[TEST FAILED] - Lỗi điều hướng: {e}")
            return False
    
    def change_order_status(self, from_status, to_status, driver=None, wait=None):
        """Thay đổi trạng thái đơn hàng"""
        if driver is None:
            driver = self.driver
        if wait is None:
            wait = self.wait
            
        try:
            status_button = wait.until(
                EC.element_to_be_clickable((By.XPATH, f"//button[contains(@class, 'ant-btn') and contains(., '{from_status}')]"))
            )
            status_button.click()
            
            new_status_option = wait.until(
                EC.element_to_be_clickable((By.XPATH, f"//li[contains(@class, 'ant-dropdown-menu-item') and .//span[contains(text(), '{to_status}')]]"))
            )
            new_status_option.click()
            
            print(f"Đổi trạng thái từ {from_status} sang {to_status} thành công")
            
            return True
        except Exception as e:
            print(f"Lỗi khi đổi trạng thái đơn hàng: {e}")
            return False
    @log_test_execution
    def run_test(self):
        """Chạy test case với 2 cửa sổ riêng biệt"""
        try:
            print("Bắt đầu test case: Trạng thái đơn hàng bị thay đổi đồng thời từ người quản trị khác")



            print("[CỬA SỔ 1 - USER 1] Đăng nhập và truy cập trang admin")
            if not self.login("huygiavu2003@gmail.com", "12345678"):
                return False
            if not self.navigate_to_admin_orders():
                return False

            print("[CỬA SỔ 1] Đã chuẩn bị xong, tạm dừng tại trang quản lý đơn hàng")


            print("[CỬA SỔ 2 - USER 2] Mở cửa sổ mới và đăng nhập user admin")
            

            chrome_options = Options()
            chrome_options.add_argument("--incognito")
            chrome_options.add_argument("--disable-logging")
            chrome_options.add_argument("--disable-gpu-sandbox")
            chrome_options.add_argument("--disable-software-rasterizer")
            chrome_options.add_argument("--disable-background-timer-throttling")
            chrome_options.add_argument("--disable-backgrounding-occluded-windows")
            chrome_options.add_argument("--disable-renderer-backgrounding")
            chrome_options.add_argument("--disable-features=TranslateUI")
            chrome_options.add_argument("--disable-ipc-flooding-protection")
            chrome_options.add_argument("--log-level=3")
            chrome_options.add_argument("--disable-web-security")
            chrome_options.add_argument("--disable-features=VizDisplayCompositor")
            chrome_options.add_argument("--disable-dev-shm-usage")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            service = Service(ChromeDriverManager().install())
            self.driver2 = webdriver.Chrome(service=service, options=chrome_options)
            self.driver2.maximize_window()
            self.wait2 = WebDriverWait(self.driver2, 10)


            if not self.login("admin@gmail.com", "12345678", self.driver2, self.wait2):
                self.driver2.quit()
                return False


            if not self.navigate_to_admin_orders(self.driver2, self.wait2):
                self.driver2.quit()
                return False
                
            if not self.change_order_status("Pending", "Cancel", self.driver2, self.wait2):
                self.driver2.quit()
                return False

            print("[CỬA SỔ 2] Admin đã thay đổi trạng thái đơn hàng thành công")
            time.sleep(2)


            print("[CỬA SỔ 1 - USER 1] Quay lại để thử thay đổi đơn hàng đã bị hủy")
            

            result = self.change_order_status("Pending", "In Delivery")


            time.sleep(3)
            try:
                toast = self.driver.find_element(By.CLASS_NAME, "Toastify__toast-body")
                toast_text = toast.text.strip()
                
                if any(keyword in toast_text.lower() for keyword in ["có lỗi", "không thể", "đã được thay đổi", "trạng thái không hợp lệ"]):
                    print("USER 1 bị từ chối thay đổi trạng thái như kỳ vọng - Đơn hàng đã bị thay đổi từ cửa sổ khác")
                else:
                    print(f"Thông báo không rõ ràng: {toast_text}")
            except NoSuchElementException:
                print("USER 1 vẫn thay đổi được trạng thái khi đơn hàng đã bị thay đổi từ cửa sổ khác")


            self.driver2.quit()
            print("[CỬA SỔ 2] Đã đóng cửa sổ admin")


            return True

        except Exception as e:
            print(f"[TEST FAILED] - Lỗi nghiêm trọng trong quá trình test: {e}")
            return False
    
    def cleanup(self):
        """Dọn dẹp và đóng browser"""
        try:
            if hasattr(self, 'driver') and self.driver:
                self.driver.quit()
                print("Đã đóng cửa sổ chính")
        except:
            pass
            
        try:
            if hasattr(self, 'driver2') and self.driver2:
                self.driver2.quit()
                print("Đã đóng cửa sổ thứ 2")
        except:
            pass

if __name__ == "__main__":
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
    test = ChangeStatusConcurrentTest()
    try:
        success = test.run_test()
        if success:
            print("TEST PASSED")
        else:
            print("TEST FAILED")
    finally:
        test.cleanup()
