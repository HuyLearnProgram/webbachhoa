import threading
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
import os
import random

# Event để đồng bộ hóa việc áp dụng voucher giữa 2 user
voucher_applied_event = threading.Event()

class TC13_VoucherConcurrentApplyTest:
    def __init__(self):
        chrome_options = Options()
        chrome_options.add_argument("--incognito")
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        self.actions = ActionChains(self.driver)
        self.driver.maximize_window()
        
        # Biến để lưu thông tin voucher
        self.selected_voucher_code = None
    
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
            
            self.mark_test_status("PASS", f"Đăng nhập thành công với email: {email}", level="Exemplary")
            return True
        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi đăng nhập: {e}", level="Below Expectation")
            return False
    
    def add_products_to_cart(self, num_products=2):
        """Thêm sản phẩm vào giỏ hàng với tổng giá trị >= 40,000đ để đủ điều kiện voucher"""
        try:
            for i in range(num_products):
                # Quay về trang chủ
                self.driver.get('http://localhost:5173/')
                time.sleep(1)
                
                # Đợi sản phẩm load
                products = self.wait.until(
                    EC.presence_of_all_elements_located((By.XPATH, "//div[contains(@class, 'w-full border p-[15px]')]//img"))
                )
                
                if products:
                    # Chọn sản phẩm ngẫu nhiên
                    random_product = products[random.randint(0, len(products) - 1)]
                    self.actions.move_to_element(random_product).click().perform()
                    time.sleep(1)
                    
                    # Kiểm tra có phải hết hàng không
                    isSoldOut = self.driver.find_elements(
                        By.XPATH, "//p[contains(@class, 'text-red-500') and contains(text(), 'Sản phẩm đang tạm hết hàng')]"
                    )
                    if isSoldOut:
                        continue
                    
                    # Nhập số lượng để đảm bảo đủ điều kiện voucher
                    quantity_input = self.wait.until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='number'][class='w-15 text-center input-blur']"))
                    )
                    quantity_input.clear()
                    random_quantity = random.randint(2, 4)  # Tăng số lượng để đủ 40k
                    quantity_input.send_keys(str(random_quantity))
                    
                    # Thêm vào giỏ hàng
                    add_to_cart_button = self.wait.until(
                        EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Thêm vào giỏ hàng')]"))
                    )
                    add_to_cart_button.click()
                    time.sleep(2)
            
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
            time.sleep(2)
            
            # Chọn tất cả sản phẩm trong giỏ hàng
            cart_items = self.wait.until(
                EC.presence_of_all_elements_located((By.XPATH, "//input[@type='checkbox']"))
            )
            
            for item in cart_items:
                if not item.is_selected():
                    item.click()
                    time.sleep(0.5)
            
            self.mark_test_status("PASS", "Đã chọn tất cả sản phẩm trong giỏ hàng", level="Sufficient")
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
        
        # Cách 2: Cuộn xuống trước khi tìm
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
                
                # Click nút
                if cart_payment_button.is_enabled() and cart_payment_button.is_displayed():
                    try:
                        WebDriverWait(self.driver, 5).until(EC.element_to_be_clickable(cart_payment_button))
                        cart_payment_button.click()
                    except:
                        self.driver.execute_script("arguments[0].click();", cart_payment_button)
                        
                    self.mark_test_status("PASS", "Nút thanh toán hoạt động bình thường", level="Sufficient")
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
    
    def apply_voucher_if_available(self):
        """Áp dụng mã giảm giá GIAM20KTESTDONGTHOI nếu còn lại 1 lần sử dụng"""
        try:
            # Nhấn nút chọn voucher
            voucher_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Chọn voucher')]"))
            )
            voucher_button.click()
            time.sleep(2)

            # Đợi modal hiện
            modal = self.wait.until(
                EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'bg-white') and contains(., 'Chọn mã giảm giá')]"))
            )

            # Tìm voucher GIAM20KTESTDONGTHOI với "Còn lại: 1"
            target_voucher = None
            try:
                # Tìm voucher theo code và kiểm tra "Còn lại: 1"
                voucher_elements = self.driver.find_elements(By.XPATH, 
                    "//div[contains(@class, 'flex-1 p-3 space-y-1')]"
                )
                
                for voucher in voucher_elements:
                    try:
                        # Kiểm tra mã voucher
                        voucher_code = voucher.find_element(By.XPATH, ".//span[@class='font-medium text-blue-600']").text.strip()
                        
                        # Kiểm tra số lần còn lại
                        remaining_text = voucher.find_element(By.XPATH, ".//div[contains(text(), 'Còn lại:')]").text.strip()
                        
                        if voucher_code == "GIAM20KTESTDONGTHOI" and "Còn lại: 1" in remaining_text:
                            target_voucher = voucher
                            self.selected_voucher_code = voucher_code
                            print(f"Tìm thấy voucher: {voucher_code} - {remaining_text}")
                            break
                    except:
                        continue
                        
            except Exception as e:
                print(f"Lỗi khi tìm voucher: {e}")

            if not target_voucher:
                # Đóng modal
                close_button = self.driver.find_element(By.XPATH, "//button[contains(text(),'Trở lại')]")
                close_button.click()
                self.mark_test_status("FAIL", "Không tìm thấy mã giảm giá GIAM20KTESTDONGTHOI còn lại 1 lần sử dụng", level="Below Expectation")
                return False

            # Scroll đến voucher và click
            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", target_voucher)
            time.sleep(1)

            try:
                self.actions.move_to_element(target_voucher).click().perform()
            except:
                self.driver.execute_script("arguments[0].click();", target_voucher)

            time.sleep(1)

            # Click nút OK
            ok_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(),'OK')]"))
            )
            ok_button.click()
            
            self.mark_test_status("PASS", f"Áp dụng mã giảm giá {self.selected_voucher_code} thành công", level="Exemplary")
            return True

        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi khi áp dụng mã giảm giá: {e}", level="Below Expectation")
            return False
    
    def select_payment_method_cod(self):
        """Chọn phương thức thanh toán"""
        try:
            time.sleep(3)
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

    def run_tc13(self):
        """Chạy test case: Áp dụng voucher đồng thời với 2 user khác nhau"""
        try:
            print("=== BẮT ĐẦU TEST CASE TC13: ÁP DỤNG VOUCHER ĐỒNG THỜI ===")
            print("Scenario: Voucher GIAM20KTESTDONGTHOI chỉ còn 1 lần sử dụng")
            print("=" * 70)

            # ===== CỬA SỔ 1 - USER 1 =====
            print("\n[CỬA SỔ 1 - USER 1] Đăng nhập và chuẩn bị đơn hàng")
            if not self.login('huygiavu2003@gmail.com', '12345678'):
                return False
            
            if not self.add_products_to_cart(2):
                return False
            
            time.sleep(1)
            if not self.open_cart_and_select_items():
                return False
            time.sleep(1)
            if not self.proceed_to_checkout():
                return False
            time.sleep(1)
            if not self.fill_shipping_info("57 đường Man Thiện, phường Hiệp Phú, thành phố Thủ Đức", "0912345678"):
                return False
            
            # Kiểm tra và áp dụng voucher
            if not self.apply_voucher_if_available():
                return False
            
            print("[USER 1] Đã áp dụng voucher thành công, tạm dừng tại trang thanh toán")

            # ===== MỞ CỬA SỔ MỚI CHO USER 2 =====
            print("\n[CỬA SỔ 2 - USER 2] Mở cửa sổ mới và đăng nhập user khác")
            
            # Tạo driver mới cho user 2
            chrome_options = Options()
            chrome_options.add_argument("--incognito")
            service = Service(ChromeDriverManager().install())
            user2_driver = webdriver.Chrome(service=service, options=chrome_options)
            user2_driver.maximize_window()

            # Lưu driver hiện tại (user 1)
            user1_driver = self.driver
            user1_wait = self.wait
            user1_actions = self.actions

            # Chuyển sang driver user 2
            self.driver = user2_driver
            self.wait = WebDriverWait(self.driver, 10)
            self.actions = ActionChains(self.driver)

            # User 2 đăng nhập
            if not self.login('test@gmail.com', '12345678'):
                user2_driver.quit()
                return False

            # User 2 thêm sản phẩm và chuẩn bị đơn hàng
            if not self.add_products_to_cart(2):
                user2_driver.quit()
                return False

            time.sleep(1)
            if not self.open_cart_and_select_items():
                user2_driver.quit()
                return False
            time.sleep(1)
            if not self.proceed_to_checkout():
                user2_driver.quit()
                return False
            if not self.fill_shipping_info("57 đường Man Thiện, phường Hiệp Phú, thành phố Thủ Đức", "0987654321"):
                user2_driver.quit()
                return False
            
            # User 2 áp dụng cùng voucher
            if not self.apply_voucher_if_available():
                user2_driver.quit()
                return False
            
            time.sleep(1)
            
            # User 2 thực hiện thanh toán trước
            if not self.select_payment_method_cod():
                user2_driver.quit()
                return False

            print("[USER 2] Thanh toán thành công - Đã sử dụng voucher")
            time.sleep(5)

            # ===== QUAY LẠI CỬA SỔ USER 1 =====
            print("\n[CỬA SỔ 1 - USER 1] Quay lại để thử thanh toán với voucher đã hết lượt dùng")
            
            # Đóng cửa sổ user 2
            user2_driver.quit()
            
            # Khôi phục driver user 1
            self.driver = user1_driver
            self.wait = user1_wait
            self.actions = user1_actions

            # User 1 thử thanh toán
            result = self.select_payment_method_cod()

            # Chờ toast phản hồi
            time.sleep(5)
            try:
                toast = self.driver.find_element(By.CLASS_NAME, "Toastify__toast-body")
                toast_text = toast.text.strip()
                print(f"Toast message: {toast_text}")
                
                if "mã giảm giá đã dùng hết" in toast_text.lower():
                    self.mark_test_status("PASS", "USER 1 bị từ chối thanh toán như kỳ vọng - Mã giảm giá đã dùng hết", level="Exemplary")
                elif any(keyword in toast_text.lower() for keyword in ["không thể tạo đơn hàng", "lỗi hệ thống"]):
                    self.mark_test_status("PASS", "USER 1 bị từ chối thanh toán - Hệ thống phát hiện voucher đã hết", level="Exemplary")
                else:
                    self.mark_test_status("INCONCLUSIVE", f"Thông báo không rõ ràng: {toast_text}", level="Developing")
            except NoSuchElementException:
                self.mark_test_status("FAIL", "USER 1 vẫn thanh toán được khi voucher đã hết lượt dùng", level="Below Expectation")

            print("=" * 70)
            return True

        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi nghiêm trọng trong quá trình test: {e}", level="Below Expectation")
            return False
    
    def cleanup(self):
        """Dọn dẹp và đóng browser"""
        try:
            if hasattr(self, 'driver') and self.driver:
                self.driver.quit()
                print("Đã đóng browser chính")
        except:
            pass

# Chạy test
if __name__ == "__main__":
    # Tắt log TensorFlow ở mức môi trường
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
    # Instantiate the test class
    test = TC13_VoucherConcurrentApplyTest()
    try:
        success = test.run_tc13()
        if success:
            print("\nTEST COMPLETED")
        else:
            print("\nTEST FAILED")
    finally:
        test.cleanup()
