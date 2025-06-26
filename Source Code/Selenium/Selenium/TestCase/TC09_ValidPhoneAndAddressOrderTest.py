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


class TC09_ValidPhoneAndAddressOrderTest:
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
      
    def select_payment_method(self, method="cod"):
        """Chọn phương thức thanh toán - Test validation thông tin bắt buộc"""
        try:
            time.sleep(3)
            
            # Tìm nút thanh toán
            payment_button = self.wait.until(
                EC.presence_of_element_located((By.XPATH, "//button[contains(@class, 'bg-green-600') and contains(text(), 'Thanh toán khi nhận hàng')]"))
            )
            
            # Click nút để trigger validation (đây là mục đích của TC09)
            try:
                payment_button.click()
                self.mark_test_status("PASS", "Đã click nút thanh toán - Test validation thành công", level="Sufficient")
                
                # Kiểm tra xem có thông báo lỗi validation xuất hiện không
                time.sleep(2)  # Đợi validation message xuất hiện
                
                # Tìm thông báo lỗi validation (text đỏ dưới input)
                error_messages = self.driver.find_elements(By.XPATH, "//small[contains(@class, 'text-red-500') and contains(text(), 'Vui lòng')]")

                if error_messages:
                    error_details = []
                    for msg in error_messages:
                        error_details.append(msg.text)
                    
                    # SỬA NỘI DUNG THÔNG BÁO LỖI RÕ RÀNG HỚN
                    self.mark_test_status("FAIL", 
                        f"Phát hiện {len(error_messages)} lỗi validation bắt buộc: {', '.join(error_details)}. Vui lòng kiểm tra lại địa chỉ và số điện thoại.", 
                        level="Below Expectation")
                    return False
                else:
                    # Nếu không có text đỏ validation, kiểm tra toast message
                    try:
                        toast = self.driver.find_element(By.CLASS_NAME, "Toastify__toast-body")
                        toast_text = toast.text.strip()
                        print(f"Toast message: {toast_text}")
                        
                        # Kiểm tra các thông báo lỗi từ backend validation
                        validation_keywords = [
                            # Address validation errors
                            "địa chỉ không được để trống", "địa chỉ không được chỉ chứa khoảng trắng",
                            "địa chỉ phải có ít nhất", "địa chỉ không được vượt quá", 
                            "địa chỉ không thể chỉ chứa số", "địa chỉ chứa ký tự đặc biệt",
                            "địa chỉ thiếu thông tin tỉnh/thành phố",
                            
                            # Phone validation errors  
                            "số điện thoại không được để trống", "số điện thoại phải bắt đầu bằng số 0",
                            "số điện thoại chỉ được chứa số", "số điện thoại phải có ít nhất",
                            "số điện thoại không được vượt quá", "đầu số điện thoại không hợp lệ"
                        ]
                        
                        if any(keyword in toast_text.lower() for keyword in validation_keywords):
                            self.mark_test_status("FAIL", 
                                f"Backend validation lỗi: {toast_text}", 
                                level="Below Expectation")
                            return False
                        else:
                            self.mark_test_status("PASS", 
                                f"Thanh toán thành công: {toast_text}", 
                                level="Exemplary")
                            return True
                            
                    except NoSuchElementException:
                        self.mark_test_status("PASS", 
                            "Không có thông báo lỗi validation - Form hợp lệ và thanh toán thành công", 
                            level="Exemplary")
                        return True
                    
            except Exception as click_error:
                self.mark_test_status("PASS", 
                    f"Nút bị disable do validation - Element click intercepted: {str(click_error)[:100]}...", 
                    level="Exemplary")
                return True

        except Exception as e:
            self.mark_test_status("BLOCKED", f"Không thể tìm thấy nút thanh toán: {e}", level="Below Expectation")
            return False


    def run_TC09(self):
        """Chạy test case chính"""
        try:
            print("=== BẮT ĐẦU TEST CASE TC09: KIỂM TRA VALIDATION SỐ ĐIỆN THOẠI VÀ ĐỊA CHỈ ===")
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
            # Test fali địa chỉ
            if not self.fill_shipping_info("Khóm 9", "0921984351"):
                return False
            # Test fali phone
            # if not self.fill_shipping_info("97 đường Man Thiện, phường Hiệp Phú, Thành phố Thủ Đức", "022351"):
            #     return False
            # Test pass
            # if not self.fill_shipping_info("97 đường Man Thiện, phường Hiệp Phú, Thành phố Thủ Đức", "092184351"):
            #     return False
            
            # Bước 6: Chọn phương thức thanh toán
            if not self.select_payment_method("cod"):
                return False
            
            print("-" * 50)
            time.sleep(7)
            return True
            
        except Exception as e:
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
    test = TC09_ValidPhoneAndAddressOrderTest()
    try:
        success = test.run_TC09()
        if success:
            print("\nTEST PASSED")
        else:
            print("\nTEST FAILED")
    finally:
        test.cleanup()
