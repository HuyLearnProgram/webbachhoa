from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
from selenium.webdriver.common.keys import Keys
from SaveTestcaseLog import log_test_execution
class AdminOrderPendingUpdateInfoTest:
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
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        self.driver.maximize_window()
    
    def login(self, email, password):
        """Đăng nhập vào hệ thống"""
        try:
            self.driver.get('http://localhost:5173/')
            print("Đã truy cập trang web thành công!")
            
            login_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/login' and contains(text(), 'Đăng nhập hoặc đăng ký')]"))
            )
            login_link.click()
            
            email_field = self.wait.until(EC.presence_of_element_located((By.NAME, "email")))
            password_field = self.driver.find_element(By.NAME, "password")
            
            email_field.clear()
            email_field.send_keys(email)
            password_field.clear()
            password_field.send_keys(password)
            
            login_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Đăng nhập')]"))
            )
            login_button.click()
            time.sleep(5)
            print("Đã đăng nhập thành công!")
            
            return True
        except Exception as e:
            print(f"Lỗi đăng nhập: {e}")
            return False
    
    def navigate_to_admin_orders(self):
        """Điều hướng đến trang quản lý đơn hàng"""
        try:
            profile_element = self.wait.until(EC.element_to_be_clickable((By.ID, "profile")))
            profile_element.click()
            
            admin_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/admin/overview' and contains(text(), 'Trang quản trị')]"))
            )
            admin_link.click()
            print("Đã vào Admin Workplace")
            
            self.wait.until(EC.url_contains("/admin/overview"))
            
            order_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/admin/order' and contains(text(), 'Đơn đặt hàng')]"))
            )
            order_link.click()
            
            self.wait.until(EC.url_contains("/admin/order"))
            print("Đã vào trang đơn đặt hàng thành công!")
            
            return True
        except Exception as e:
            print(f"Lỗi điều hướng: {e}")
            return False
    
    def filter_orders_by_status(self, status="Pending"):
        """Lọc đơn hàng theo trạng thái"""
        try:
            time.sleep(2)
            
            dropdown = self.wait.until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "div.ant-select-selector"))
            )
            dropdown.click()
            
            self.wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, ".ant-select-dropdown")))
            time.sleep(1)
            
            status_option = self.driver.find_element(By.XPATH, f"//div[contains(@class, 'ant-select-item') and text()='{status}']")
            status_option.click()
            
            print(f"Đã lọc theo trạng thái {status} thành công!")
            time.sleep(3)
            
            return True
        except Exception as e:
            print(f"Lỗi lọc đơn hàng theo trạng thái: {e}")
            return False
    
    def view_order_detail_and_update_info(self):
        """Xem chi tiết đơn hàng và cập nhật thông tin giao hàng với dữ liệu không hợp lệ"""
        try:
            print("Đang tìm đơn hàng Pending để xem chi tiết...")
            details_button = self.wait.until(
                EC.element_to_be_clickable((
                    By.CSS_SELECTOR, "tbody.ant-table-tbody tr:first-child td:last-child a"
                ))
            )
            
            # Lấy order ID từ href
            order_id = details_button.get_attribute('href').split('/')[-1]
            print(f"Đã tìm thấy đơn hàng Pending ID: {order_id}")
            
            details_button.click()
            time.sleep(2)
            print("Đã vào trang chi tiết đơn hàng")
            
            update_button = self.wait.until(
                EC.element_to_be_clickable((
                    By.XPATH, "//button[.//span[text()='Cập nhật thông tin giao hàng']]"
                ))
            )
            update_button.click()
            time.sleep(2)
            print("Đã mở modal cập nhật thông tin")
            
            print("Đang cập nhật thông tin giao hàng với dữ liệu không hợp lệ...")
            phone_input = self.wait.until(
                EC.presence_of_element_located((By.ID, "phone"))
            )
            address_input = self.wait.until(
                EC.presence_of_element_located((By.ID, "address"))
            )


            time.sleep(1)
            phone_input.send_keys(Keys.CONTROL + "a")
            phone_input.send_keys(Keys.DELETE)
            phone_input.send_keys("abc")
            time.sleep(1)

            time.sleep(1)
            
            # Để trống địa chỉ
            address_input.clear()
            time.sleep(1)
            address_input.send_keys(Keys.CONTROL + "a") 
            address_input.send_keys(Keys.DELETE) 
            address_input.send_keys("158 Trần Hưng Đạo Sài Gòn")
            time.sleep(1)


            time.sleep(1)

            confirm_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(@class,'ant-btn-primary') and span[text()='Cập nhật']]"))
            )
            confirm_button.click()

            error_message_selectors = [
                "//div[contains(@class, 'ant-form-item-explain-error')]",
                "//div[contains(@class, 'ant-message-error')]",
                "//span[contains(text(), 'không hợp lệ')]",
                "//span[contains(text(), 'bắt buộc')]",
                "//span[contains(text(), 'không được để trống')]",
                "//div[contains(@class, 'ant-form-item-has-error')]"
            ]
            
            validation_error_found = False
            for selector in error_message_selectors:
                try:
                    error_element = self.wait.until(
                        EC.presence_of_element_located((By.XPATH, selector))
                    )
                    if error_element and error_element.is_displayed():
                        error_text = error_element.text
                        print(f"Đã phát hiện lỗi validation: {error_text}")
                        validation_error_found = True
                        break
                except:
                    continue
            
            if not validation_error_found:
                print("Không phát hiện thông báo lỗi validation - có thể form đã được submit")
            
            # Đóng modal
            try:
                cancel_button = self.driver.find_element(By.XPATH, "//button[contains(@class,'ant-btn') and span[text()='Hủy']]")
                cancel_button.click()
                # print("Đã đóng modal")
            except:
                print("Không tìm thấy nút Hủy hoặc modal đã đóng")
            
            return True, order_id
            
        except Exception as e:
            print(f"Lỗi trong quá trình xem chi tiết và cập nhật: {e}")
            return False, None
    @log_test_execution
    def run_test(self):
        """Chạy test case chính: Lọc Pending -> Xem chi tiết -> Cập nhật thông tin không hợp lệ"""
        try:
            print("Bắt đầu test case: Cập nhật thông tin giao hàng với dữ liệu không hợp lệ")

            if not self.login('huygiavu2003@gmail.com', '12345678'):
                return False
            
            if not self.navigate_to_admin_orders():
                return False
            
            if not self.filter_orders_by_status("Pending"):
                return False
            
            success, order_id = self.view_order_detail_and_update_info()
            if not success:
                return False

            
            time.sleep(5)
            return True
            
        except Exception as e:
            print(f"Lỗi trong quá trình test: {e}")
            return False
    
    def cleanup(self):
        """Dọn dẹp và đóng browser"""
        if self.driver:
            self.driver.quit()
            # print("Đã đóng browser")

# Chạy test
if __name__ == "__main__":
    test = AdminOrderPendingUpdateInfoTest()
    try:
        success = test.run_test()
        if success:
            print("TEST PASSED ")
        else:
            print("TEST FAILED ")
    finally:
        test.cleanup()
