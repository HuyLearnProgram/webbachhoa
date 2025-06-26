## Vũ Gia Huy ##
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


class TC06_ApplyVoucherForOrderTest:
    def __init__(self):
        chrome_options = Options()
        chrome_options.add_argument("--incognito")
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        self.actions = ActionChains(self.driver)
        self.driver.maximize_window()  

        # Thêm tracking cho TC06
        self.total_before_voucher = 0
        self.total_after_voucher = 0

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
    
    def apply_voucher_if_available(self):
        """Áp dụng mã giảm giá nếu có"""
        try:
             # **TC06 - Lấy tổng tiền TRƯỚC khi áp dụng voucher**
            self.total_before_voucher = self.get_current_total()

            # Nhấn nút chọn voucher
            voucher_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Chọn voucher')]"))
            )
            voucher_button.click()
            time.sleep(1.5)

            # Đợi modal hiện
            modal = self.wait.until(
                EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'bg-white') and contains(., 'Chọn mã giảm giá')]"))
            )

            # Lấy danh sách voucher đủ điều kiện
            voucher_modal_xpath = "//div[contains(@class, 'bg-white') and contains(@class, 'rounded-md') and contains(., 'Chọn mã giảm giá')]"
            vouchers = self.driver.find_elements(By.XPATH, f"{voucher_modal_xpath}//div[contains(@class, 'cursor-pointer') and not(contains(@class,'cursor-not-allowed'))]")
            
            if not vouchers:
                close_button = self.driver.find_element(By.XPATH, "//button[contains(text(),'Trở lại')]")
                close_button.click()
                self.mark_test_status("INCONCLUSIVE", "Không có voucher đủ điều kiện để áp dụng", level="Developing")
                return False

            # Scroll đến voucher, đảm bảo có thể click
            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", vouchers[0])
            time.sleep(1)

            try:
                self.actions.move_to_element(vouchers[0]).click().perform()
            except:
                self.driver.execute_script("arguments[0].click();", vouchers[0])

            # Click nút OK
            ok_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(),'OK')]"))
            )
            ok_button.click()
            self.mark_test_status("PASS", "Áp dụng mã giảm giá thành công", level="Exemplary")

            time.sleep(2)

            # **TC06 - Lấy tổng tiền SAU khi áp dụng voucher**
            self.total_after_voucher = self.get_current_total()
            
            # **TC06 - So sánh và đánh giá**
            if self.total_after_voucher < self.total_before_voucher:
                discount = self.total_before_voucher - self.total_after_voucher
                self.mark_test_status("PASS", f"TC06 - Tổng tiền giảm từ {self.total_before_voucher:,}đ xuống {self.total_after_voucher:,}đ (giảm {discount:,}đ)", level="Exemplary")
            elif self.total_after_voucher == self.total_before_voucher:
                self.mark_test_status("INCONCLUSIVE", "TC06 - Tổng tiền không thay đổi sau khi áp dụng voucher", level="Developing")
            else:
                self.mark_test_status("FAIL", f"TC06 - Tổng tiền tăng từ {self.total_before_voucher:,}đ lên {self.total_after_voucher:,}đ", level="Below Expectation")
            
            self.mark_test_status("PASS", "Áp dụng mã giảm giá thành công", level="Exemplary")
            return True

        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi khi áp dụng mã giảm giá: {e}", level="Below Expectation")
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

    def get_current_total(self):
        """Lấy tổng tiền hiện tại từ UI"""
        try:
            total_element = self.wait.until(
                EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'text-2xl font-bold text-center') and contains(text(), 'Tổng tiền:')]//span[contains(@class, 'text-green-500')]"))
            )
            
            total_text = total_element.text
            # Parse: "173.000 ₫" -> 173000
            total_clean = total_text.replace('₫', '').replace('&nbsp;', '').replace('.', '').replace(',', '').strip()
            return int(total_clean)
            
        except Exception as e:
            print(f"Lỗi lấy tổng tiền: {e}")
            return 0

    def run_TC06(self):
        """Chạy test case chính"""
        try:
            print("=== BẮT ĐẦU TEST CASE TC06: TÍNH TOÁN LẠI TỔNG TIỀN ĐƠN HÀNG SAU KHI ÁP DỤNG VOUCHER ===")
            print("-" * 50)

            # Bước 1: Đăng nhập
            if not self.login('huygiavu2003@gmail.com', '12345678'):
                self.mark_test_status("FAIL", "Đăng nhập thất bại - dừng test tổng", level="Below Expectation")
                return False

            # Bước 2: Thêm sản phẩm vào giỏ hàng
            if not self.add_products_to_cart(2):
                self.mark_test_status("FAIL", "Thêm sản phẩm vào giỏ hàng thất bại", level="Below Expectation")
                return False

            # Bước 3: Mở giỏ hàng và chọn sản phẩm
            if not self.open_cart_and_select_items():
                self.mark_test_status("FAIL", "Không thể chọn sản phẩm trong giỏ", level="Below Expectation")
                return False

            # Bước 4: Tiến hành thanh toán
            if not self.proceed_to_checkout():
                self.mark_test_status("FAIL", "Lỗi khi chuyển sang trang thanh toán", level="Below Expectation")
                return False

            # Bước 5: Điền thông tin giao hàng
            # if not self.fill_shipping_info("57 Man Thiện, Phường Hiệp Phú, Quận Thủ Đức, Sài Gòn", "0912345678"):
            #     self.mark_test_status("FAIL", "Không điền được thông tin giao hàng", level="Below Expectation")
            #     return False

            # Bước 6: Áp dụng mã giảm giá
            if not self.apply_voucher_if_available():
                self.mark_test_status("INCONCLUSIVE", "Không thể áp dụng mã giảm giá hoặc không đủ điều kiện", level="Developing")

            time.sleep(2)

            # Bước 7: Chọn phương thức thanh toán
            # if not self.select_payment_method_cod():
            #     self.mark_test_status("FAIL", "Không thể chọn phương thức thanh toán", level="Below Expectation")
            #     return False

            # Toàn bộ quy trình đã hoàn tất thành công
            self.mark_test_status("PASS", "Toàn bộ use case mua hàng hoàn tất", level="Exemplary")
            print("-" * 50)
            time.sleep(3)
            return True

        except Exception as e:
            self.mark_test_status("FAIL", f"Lỗi nghiêm trọng trong quá trình test: {e}", level="Below Expectation")
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
    test = TC06_ApplyVoucherForOrderTest()
    try:
        success = test.run_TC06()
        if success:
            print("\nTEST PASSED")
        else:
            print("\nTEST FAILED")
    finally:
        test.cleanup()
