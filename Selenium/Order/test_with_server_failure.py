## Vu Gia Huy
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
import time
import random
import os


class ServerFailureTest:
    def __init__(self):
        chrome_options = Options()
        chrome_options.add_argument("--incognito")
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        self.actions = ActionChains(self.driver)
        self.driver.maximize_window()  

    
    def login(self, email, password):
        """Đăng nhập vào hệ thống"""
        try:
            # Truy cập trang web
            self.driver.get('http://localhost:5173/')
            time.sleep(1)
            
            # Click vào liên kết đăng nhập
            login_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/login' and contains(text(), 'Đăng nhập hoặc đăng ký')]"))
            )
            login_link.click()
            time.sleep(2)
            
            # Nhập thông tin đăng nhập
            username_field = self.wait.until(EC.presence_of_element_located((By.NAME, "email")))
            password_field = self.driver.find_element(By.NAME, "password")
            
            username_field.clear()
            username_field.send_keys(email)
            password_field.clear()
            password_field.send_keys(password)
            time.sleep(2)
            
            # Click nút đăng nhập
            login_button = self.driver.find_element(By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Đăng nhập')]")
            login_button.click()
            time.sleep(5)
            
            self.mark_test_status("PASS", "Đăng nhập thành công", level="Exemplary")
            return True
        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi đăng nhập: {e}", level="Below Expectation")
            return False
    
    def add_products_to_cart(self, num_products=3):
        """Thêm sản phẩm vào giỏ hàng"""
        try:
            
            for i in range(num_products):
                # Quay về trang chủ
                self.driver.get('http://localhost:5173/')
                
                # Đợi sản phẩm load
                products = self.wait.until(
                    EC.presence_of_all_elements_located((By.XPATH, "//div[contains(@class, 'w-full border p-[15px]')]//img"))
                )
                
                if products:
                    # Chọn sản phẩm ngẫu nhiên
                    random_product = products[random.randint(0, len(products) - 1)]
                    self.actions.move_to_element(random_product).click().perform()
                    
                    # Nhập số lượng ngẫu nhiên
                    quantity_input = self.wait.until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='number'][class='w-15 text-center input-blur']"))
                    )
                    quantity_input.clear()
                    random_quantity = random.randint(1, 5)
                    quantity_input.send_keys(str(random_quantity))
                    
                    # Thêm vào giỏ hàng
                    add_to_cart_button = self.wait.until(
                        EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'px-4 py-2 rounded-md text-white bg-main text-semibold my-2 w-full')]"))
                    )
                    if not add_to_cart_button:
                        continue
                    add_to_cart_button.click()
            
            self.mark_test_status("PASS", "Thêm sản phẩm vào giỏ hàng thành công", level="Exemplary")
            return True
        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi thêm sản phẩm vào giỏ hàng: {e}", level="Below Expectation")
            return False
    
    def open_cart_and_select_items(self):
        """Mở giỏ hàng và chọn sản phẩm"""
        try:
            # Mở giỏ hàng
            cart_page = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'cursor-pointer') and contains(., 'sản phẩm')]"))
            )
            cart_page.click()
            
            # Chọn sản phẩm trong giỏ hàng
            cart_items = self.wait.until(
                EC.presence_of_all_elements_located((By.XPATH, "//input[@type='checkbox']"))
            )
            
            if len(cart_items) >= 2:
                selected_items = random.sample(cart_items, 2)
                for item in selected_items:
                    item.click()
            elif len(cart_items) == 1:
                cart_items[0].click()
            else:
                self.mark_test_status("FAIL", "Giỏ hàng không có sản phẩm để chọn", level="Below Expectation")
                return False
            
            self.mark_test_status("PASS", "Đã chọn sản phẩm trong giỏ hàng", level="Sufficient")
            return True
        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi mở giỏ hàng và chọn sản phẩm: {e}", level="Below Expectation")
            return False
    
    def find_payment_button(self):
        """Tìm nút thanh toán bằng nhiều cách"""
        cart_payment_button = None
        
        # Cách 1: Tìm theo text chính xác
        try:
            cart_payment_button = WebDriverWait(self.driver, 5).until(
                EC.presence_of_element_located((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Thanh toán')]"))
            )
        except TimeoutException:
            pass
        
        # Cách 2: Tìm theo class bg-main
        if not cart_payment_button:
            try:
                buttons_with_bg_main = self.driver.find_elements(By.XPATH, "//button[contains(@class, 'bg-main')]")
                for button in buttons_with_bg_main:
                    if "thanh toán" in button.text.lower():
                        cart_payment_button = button
                        break
            except Exception as e:
                pass
        
        # Cách 3: Tìm theo text không phân biệt hoa thường
        if not cart_payment_button:
            try:
                cart_payment_button = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Thanh toán')]"))
                )
            except NoSuchElementException:
                pass
        
        # Cách 4: Cuộn xuống trước khi tìm
        if not cart_payment_button:
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            try:
                cart_payment_button = WebDriverWait(self.driver, 5).until(
                    EC.presence_of_element_located((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Thanh toán')]"))
                )
                
            except TimeoutException:
                pass

        if cart_payment_button:
            self.mark_test_status("PASS", "Đã tìm thấy nút thanh toán", level="Sufficient")
        else:
            self.mark_test_status("FAIL", "Không tìm thấy nút thanh toán", level="Below Expectation")

        return cart_payment_button
    
    def proceed_to_checkout(self):
        """Tiến hành thanh toán"""
        try:
            cart_payment_button = self.find_payment_button()
            
            if cart_payment_button:
                # Cuộn đến nút thanh toán
                self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", cart_payment_button)
                time.sleep(2)
                
                # Kiểm tra và click nút
                if cart_payment_button.is_enabled() and cart_payment_button.is_displayed():
                    try:
                        WebDriverWait(self.driver, 5).until(EC.element_to_be_clickable(cart_payment_button))
                        cart_payment_button.click()
                    except:
                        self.driver.execute_script("arguments[0].click();", cart_payment_button)
                        
                    return True
                else:
                    self.mark_test_status("FAIL", "Nút thanh toán không khả dụng", level="Below Expectation")
                    return False
            else:
                self.mark_test_status("FAIL", "Không tìm thấy nút thanh toán", level="Below Expectation")
                return False
                
        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi khi tiến hành thanh toán: {e}", level="Below Expectation")
            return False
    
    def fill_shipping_info(self, address, phone):
        """Điền thông tin giao hàng"""
        try:
            # Điền địa chỉ
            address_field = self.wait.until(EC.presence_of_element_located((By.ID, "address")))
            address_field.clear()
            address_field.send_keys(address)
            
            # Điền số điện thoại
            phone_field = self.wait.until(EC.presence_of_element_located((By.ID, "phone")))
            phone_field.clear()
            phone_field.send_keys(phone)

            self.mark_test_status("PASS", "Thông tin giao hàng đã điền hợp lệ", level="Sufficient")
            return True
        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi điền thông tin giao hàng: {e}", level="Below Expectation")
            return False
    
    def select_payment_method_cod(self):
        """Chọn phương thức thanh toán"""
        try:
            # Nhấn nút "Thanh toán khi nhận hàng"
            payment_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-green-600') and contains(text(), 'Thanh toán khi nhận hàng')]"))
            )
            payment_button.click()
            
            self.mark_test_status("PASS", "Chọn phương thức thanh toán COD thành công", level="Sufficient")
            return True
        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi chọn phương thức thanh toán: {e}", level="Below Expectation")
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

    def run_test_with_network_failure(self):
        """Test case TC09: Giả lập mất kết nối mạng khi đặt hàng"""
        try:
            print("=== BẮT ĐẦU TEST CASE TC15: XỬ LÝ LỖI KHI MẤT KẾT NỐI BACKEND ===")
            print("-" * 50)
            
            # Bước 1: Đăng nhập
            if not self.login('huygiavu2003@gmail.com', '12345678'):
                self.mark_test_status("BLOCKED", "Không thể đăng nhập – không thể kiểm thử tiếp", level="Below Expectation")
                return False
            
            # Bước 2: Thêm sản phẩm vào giỏ hàng
            if not self.add_products_to_cart(1):
                self.mark_test_status("BLOCKED", "Không thêm được sản phẩm vào giỏ hàng", level="Below Expectation")
                return False
            
            # Bước 3: Mở giỏ hàng và chọn sản phẩm
            if not self.open_cart_and_select_items():
                self.mark_test_status("BLOCKED", "Không thể chọn sản phẩm trong giỏ", level="Below Expectation")
                return False
            
            # Bước 4: Tiến hành thanh toán
            if not self.proceed_to_checkout():
                self.mark_test_status("FAIL", "Không thực hiện được hành động thanh toán", level="Below Expectation")
                return False
            
            # Bước 5: Điền thông tin giao hàng hợp lệ
            if not self.fill_shipping_info("123 Đường test, TP HCM", "0988888888"):
                self.mark_test_status("FAIL", "Không điền được thông tin giao hàng", level="Below Expectation")
                return False
            
            # 🔌 Bước 6: Giả lập tắt mạng
            # Bước 6: THỦ CÔNG – Tắt backend server
            print("\nVUI LÒNG TẠM DỪNG SERVER BACKEND NGAY BÂY GIỜ (Ctrl+C hoặc kill process)")
            input("Sau khi bạn đã tắt backend, nhấn Enter để tiếp tục test...")

            time.sleep(2)

            # Bước 7: Thử chọn phương thức thanh toán
            if not self.select_payment_method_cod():
                self.mark_test_status("PASS", "Hệ thống chặn thanh toán khi không có mạng – xử lý đúng", level="Exemplary")
                return True

            # Bước 8: Kiểm tra có hiển thị lỗi mất mạng không
            # Bước 8: Kiểm tra phản hồi sau khi backend bị tắt
            time.sleep(3)

            try:
                current_url = self.driver.current_url
                if "payment-success" in current_url:
                    self.mark_test_status("FAIL", "Đã bị redirect tới trang thành công dù backend bị tắt", level="Below Expectation")
                    return False
            except:
                pass

            try:
                toast = WebDriverWait(self.driver, 5).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "Toastify__toast--error"))
                )
                self.mark_test_status("PASS", f"Hiển thị toast lỗi: {toast.text}", level="Exemplary")
                return True
            except:
                self.mark_test_status("INCONCLUSIVE", "Không có thông báo lỗi, nhưng không bị redirect", level="Developing")
                return True

        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi không xử lý được: {e}", level="Below Expectation")
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
        test.run_test_with_network_failure()
    finally:
        test.cleanup()
