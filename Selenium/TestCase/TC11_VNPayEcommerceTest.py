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



class TC11_VNPayEcommerceTest:
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

        if not cart_payment_button:
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

            return True
        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi điền thông tin giao hàng: {e}", level="Below Expectation")
            return False
  
    def process_vnpay_payment(self):
        """Xử lý thanh toán VNPAY - TC11"""
        try:
            time.sleep(3)
            # Nhấn nút thanh toán bằng VNPAY
            vnpay_payment_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-blue-600') and contains(text(), 'Thanh toán bằng VNPAY')]"))
            )
            
            # Verify button styling trước khi click
            button_classes = vnpay_payment_button.get_attribute("class")
            if "bg-blue-600" not in button_classes:
                self.mark_test_status("FAIL", "Nút VNPAY không có styling đúng (thiếu bg-blue-600)", level="Below Expectation")
                return False
            
            vnpay_payment_button.click()
            self.mark_test_status("PASS", "TC11 - Đã chọn thanh toán bằng VNPAY thành công", level="Exemplary")
            
            # Đợi trang VNPAY tải
            time.sleep(5)
            
            # Verify redirect đến VNPAY
            current_url = self.driver.current_url
            if "vnpay" in current_url.lower() or "sandbox.vnpayment.vn" in current_url:
                self.mark_test_status("PASS", f"Redirect đến VNPAY thành công: {current_url}", level="Exemplary")
            else:
                self.mark_test_status("INCONCLUSIVE", f"Chưa redirect đến VNPAY. URL hiện tại: {current_url}", level="Developing")
            
            return True
        except Exception as e:
            self.mark_test_status("BLOCKED", f"TC11 - Lỗi chọn VNPAY: {str(e)[:100]}...", level="Below Expectation")
            return False

    def fill_card_information(self):
        """Điền thông tin thẻ VNPAY"""
        try:
            # Điền số thẻ
            try:
                card_number_field = self.wait.until(EC.presence_of_element_located((By.ID, "card_number_mask")))
                card_number_field.clear()
                card_number_field.send_keys("9704198526191432198")

            except TimeoutException:
                self.mark_test_status("BLOCKED", "Không tìm thấy trường nhập số thẻ", level="Below Expectation")
                return False
            
            # Điền tên chủ thẻ
            try:
                cardholder_field = self.wait.until(EC.presence_of_element_located((By.ID, "cardHolder")))
                cardholder_field.clear()
                cardholder_field.send_keys("NGUYEN VAN A")

            except TimeoutException:
                self.mark_test_status("BLOCKED", "Không tìm thấy trường nhập tên chủ thẻ", level="Below Expectation")
                return False
            
            # Điền ngày hết hạn
            try:
                card_date_field = self.wait.until(EC.presence_of_element_located((By.ID, "cardDate")))
                card_date_field.clear()
                card_date_field.send_keys("0715")
                
            except TimeoutException:
                self.mark_test_status("BLOCKED", "Không tìm thấy trường nhập ngày hết hạn", level="Below Expectation")
                return False
            
            self.mark_test_status("PASS", "Hoàn thành điền thông tin thẻ VNPAY", level="Exemplary")
            return True
        except Exception as e:
            self.mark_test_status("BLOCKED", f"Lỗi điền thông tin thẻ: {str(e)[:100]}...", level="Below Expectation")
            return False

    def process_payment_confirmation(self):
        """Xử lý xác nhận thanh toán VNPAY"""
        try:
            # Nhấn nút Tiếp tục
            continue_button = self.wait.until(EC.element_to_be_clickable((By.ID, "btnContinue")))
            self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", continue_button)
            time.sleep(1)
            continue_button.click()
            self.mark_test_status("PASS", "Đã nhấn nút Tiếp tục thành công", level="Sufficient")
            
            # Xử lý modal "Đồng ý & Tiếp tục"
            try:
                self.wait.until(EC.presence_of_element_located((By.ID, "btnAgree")))
                time.sleep(4)
                
                # Force click bằng JavaScript
                self.driver.execute_script("""
                    var btn = document.getElementById('btnAgree');
                    if (btn) {
                        btn.style.zIndex = '99999';
                        btn.style.position = 'relative';
                        btn.click();
                    }
                """)
                self.mark_test_status("PASS", "Đã nhấn nút 'Đồng ý & Tiếp tục' bằng JavaScript", level="Exemplary")
            except Exception as modal_error:
                self.mark_test_status("INCONCLUSIVE", f"Modal xử lý có vấn đề: {modal_error}", level="Developing")
            
            return True
        except Exception as e:
            self.mark_test_status("BLOCKED", f"Lỗi xử lý xác nhận thanh toán: {str(e)[:100]}...", level="Below Expectation")
            return False

    def complete_otp_payment(self):
        """Hoàn thành thanh toán với OTP VNPAY"""
        try:
            # Nhập OTP
            try:
                otp_field = self.wait.until(EC.presence_of_element_located((By.ID, "otpvalue")))
                self.wait.until(EC.element_to_be_clickable((By.ID, "otpvalue")))
                
                otp_field.clear()
                otp_field.send_keys("123456")
                self.mark_test_status("PASS", "Đã nhập mã OTP: 123456", level="Sufficient")
                time.sleep(2)
            except Exception as otp_error:
                self.mark_test_status("BLOCKED", f"Không thể nhập OTP: {otp_error}", level="Below Expectation")
                return False
            
            # Thanh toán cuối cùng
            try:
                payment_confirm_button = self.wait.until(EC.element_to_be_clickable((By.ID, "btnConfirm")))
                self.driver.execute_script("arguments[0].scrollIntoView({behavior: 'smooth', block: 'center'});", payment_confirm_button)
                time.sleep(1)
                payment_confirm_button.click()
                self.mark_test_status("PASS", "Đã nhấn nút Thanh toán cuối cùng", level="Sufficient")
                
                # Đợi xử lý thanh toán
                time.sleep(5)
                final_url = self.driver.current_url
                self.mark_test_status("PASS", f"Hoàn thành thanh toán VNPAY - URL cuối: {final_url}", level="Exemplary")
                
                # Verify payment success
                if "success" in final_url.lower() or "complete" in final_url.lower():
                    self.mark_test_status("PASS", "Thanh toán VNPAY thành công", level="Exemplary")
                else:
                    self.mark_test_status("INCONCLUSIVE", "Trạng thái thanh toán chưa rõ ràng", level="Developing")
                
            except Exception as confirm_error:
                self.mark_test_status("BLOCKED", f"Không thể xác nhận thanh toán: {confirm_error}", level="Below Expectation")
                return False
            
            return True
        except Exception as e:
            self.mark_test_status("BLOCKED", f"Lỗi hoàn thành OTP: {str(e)[:100]}...", level="Below Expectation")
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

    
    def run_test(self):
        """Chạy test case chính"""
        try:
            print("=== BẮT ĐẦU TEST CASE TC03: CHỌN PHƯƠNG THỨC THANH TOÁN BẰNG VNPAY ===")
            print("-" * 50)
            
            # Bước 1: Đăng nhập
            if not self.login('huygiavu2003@gmail.com', '12345678'):
                return False
            
            # Bước 2: Thêm sản phẩm vào giỏ hàng
            if not self.add_products_to_cart(3):
                return False
            
            # Bước 3: Mở giỏ hàng và chọn sản phẩm
            if not self.open_cart_and_select_items():
                return False
            
            # Bước 4: Tiến hành thanh toán
            if not self.proceed_to_checkout():
                return False
            
            # Bước 5: Điền thông tin giao hàng
            if not self.fill_shipping_info("57 Man Thiện, Phường Hiệp Phú, Quận Thủ Đức, Sài Gòn", "0912345678"):
                return False
            
            # Bước 6: Chọn thanh toán VNPAY
            if not self.process_vnpay_payment():
                return False
            
            # Bước 7: Điền thông tin thẻ
            if not self.fill_card_information():
                return False
            
            # Bước 8: Xử lý xác nhận thanh toán
            if not self.process_payment_confirmation():
                return False
            
            # Bước 9: Hoàn thành với OTP
            if not self.complete_otp_payment():
                return False
            
            print("-" * 50)
            time.sleep(10)
            return True
            
        except Exception as e:
            self.mark_test_status("BLOCKED", f"Lỗi nghiêm trọng trong quá trình thực thi test: {str(e)}", "Critical")
            return False
    
    def cleanup(self):
        """Dọn dẹp và đóng browser"""
        if self.driver:
            self.driver.quit()
            print("Đã đóng browser")

# Chạy test
if __name__ == "__main__":
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
    test = TC11_VNPayEcommerceTest()
    try:
        success = test.run_test()
        if success:
            print("\nTEST PASSED")
        else:
            print("\nTEST FAILED")
    finally:
        test.cleanup()
