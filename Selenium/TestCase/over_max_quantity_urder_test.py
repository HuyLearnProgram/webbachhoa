## Vũ Gia Huy ##
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


# Event to synchronize voucher application between tabs
voucher_applied_event = threading.Event()

class OverMaxQuantityOrderTest:
    def __init__(self):
        chrome_options = Options()
        chrome_options.add_argument("--incognito")
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        self.actions = ActionChains(self.driver)
        self.driver.maximize_window()  

         # Biến để lưu thông tin sản phẩm được chọn
        self.selected_product_name = None
        self.selected_product_xpath = None
    
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
    
    def add_same_product_to_cart(self, target_product_name):
        """User 2 thêm cùng sản phẩm mà User 1 đã chọn"""
        try:
            # Load trang chủ
            self.driver.get('http://localhost:5173/')
            time.sleep(2)

            # Tìm sản phẩm theo tên
            product_cards = self.wait.until(
                EC.presence_of_all_elements_located((By.XPATH, "//div[contains(@class, 'w-full border p-[15px]')]"))
            )

            target_product_found = False
            for card in product_cards:
                try:
                    product_name_element = card.find_element(By.XPATH, ".//span[@class='line-clamp-1']")
                    if target_product_name.lower() in product_name_element.text.lower():
                        # Click vào sản phẩm
                        product_image = card.find_element(By.XPATH, ".//img")
                        self.actions.move_to_element(product_image).click().perform()
                        target_product_found = True
                        break
                except:
                    continue

            if not target_product_found:
                self.mark_test_status("FAIL", f"User 2 không tìm thấy sản phẩm '{target_product_name}'", level="Below Expectation")
                return False

            time.sleep(1)

            # Kiểm tra có phải hết hàng không
            isSoldOut = self.driver.find_elements(
                By.XPATH, "//p[contains(@class, 'text-red-500') and contains(text(), 'Sản phẩm đang tạm hết hàng')]"
            )
            if isSoldOut:
                self.mark_test_status("PASS", "Sản phẩm đã hết hàng như mong đợi", level="Exemplary")
                return False


            # Nhập số lượng lớn
            quantity_input = self.wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='number'][class='w-15 text-center input-blur']"))
            )
            quantity_input.clear()
            quantity_input.send_keys("100000")  # Cố tình vượt quá tồn kho

            # Thêm vào giỏ
            add_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Thêm vào giỏ hàng')]"))
            )
            add_button.click()
            time.sleep(2)

            self.mark_test_status("PASS", f"User 2 đã thêm sản phẩm '{target_product_name}' vào giỏ hàng thành công", level="Exemplary")
            return True

        except Exception as e:
            self.mark_test_status("FAIL", f"User 2 lỗi thêm sản phẩm: {e}", level="Below Expectation")
            return False
  
    #hàm để user 2 thêm cùng sản phẩm
    def add_products_to_cart(self):
        """Thêm 1 sản phẩm vào giỏ hàng"""
        try:
            count = 0
            while True:
                # Load lại trang mỗi vòng lặp
                self.driver.get('http://localhost:5173/')

                # Đợi danh sách sản phẩm
                products = self.wait.until(
                    EC.presence_of_all_elements_located((By.XPATH, "//div[contains(@class, 'w-full border p-[15px]')]//img"))
                )

                if count >= len(products):
                    self.mark_test_status("FAIL", "Không tìm thấy sản phẩm phù hợp", level="Below Expectation")
                    return False

                # Chọn sản phẩm tại vị trí count
                product = products[count]

                # Lưu thông tin sản phẩm trước khi click
                product_card = product.find_element(By.XPATH, "./ancestor::div[contains(@class, 'w-full border p-[15px]')]")
                product_name_element = product_card.find_element(By.XPATH, ".//span[@class='line-clamp-1']")
                # FIX: Thống nhất tên biến
                self.selected_product_name = product_name_element.text.strip()
            
                self.actions.move_to_element(product).click().perform()
                time.sleep(1)

                # Kiểm tra có phải hết hàng không
                isSoldOut = self.driver.find_elements(
                    By.XPATH, "//p[contains(@class, 'text-red-500') and contains(text(), 'Sản phẩm đang tạm hết hàng')]"
                )
                if isSoldOut:
                    count += 1
                    continue

                # Nhập số lượng lớn
                quantity_input = self.wait.until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='number'][class='w-15 text-center input-blur']"))
                )
                quantity_input.clear()
                quantity_input.send_keys("100000")  # Cố tình vượt quá tồn kho

                # Thêm vào giỏ
                add_button = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Thêm vào giỏ hàng')]"))
                )
                add_button.click()
                
                # FIX: Không cần lấy lại tên sản phẩm ở đây vì đã lưu ở trên
                time.sleep(2)

                # Kiểm tra có toast cảnh báo không
                try:
                    toast = self.driver.find_element(By.CLASS_NAME, "Toastify__toast-body")
                    if "hết hàng" in toast.text.lower():
                        self.mark_test_status("FAIL", "Không thể thêm vì vượt quá tồn kho", level="Expected Behavior")
                        return False
                except:
                    pass

                # Nếu không có lỗi, coi như thêm thành công
                break

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
            
            # Đợi trang cart load
            time.sleep(2)
            
            # Lấy tất cả các item trong cart - FIX: XPath chính xác hơn
            cart_items = self.wait.until(
                EC.presence_of_all_elements_located((By.XPATH, "//div[@class='grid grid-cols-10 items-center border-b pb-4']"))
            )
            
            print(f"Tìm thấy {len(cart_items)} sản phẩm trong giỏ hàng")
            print(f"Đang tìm sản phẩm: '{self.selected_product_name}'")
            
            matched = False
            for i, item in enumerate(cart_items):
                try:
                    # FIX: XPath chính xác theo HTML
                    name_element = item.find_element(By.XPATH, ".//h3[@class='text-lg truncate hover:underline']")
                    name_text = name_element.text.strip()
                    
                    print(f"Sản phẩm {i+1}: '{name_text}'")

                    # So sánh chính xác tên sản phẩm
                    if self.selected_product_name.lower() == name_text.lower():
                        # FIX: XPath chính xác cho checkbox
                        checkbox = item.find_element(By.XPATH, ".//input[@type='checkbox']")
                        
                        # Scroll đến checkbox nếu cần
                        self.driver.execute_script("arguments[0].scrollIntoView(true);", checkbox)
                        time.sleep(0.5)
                        
                        # Click checkbox
                        if not checkbox.is_selected():
                            checkbox.click()
                            time.sleep(1)
                        
                        matched = True
                        self.mark_test_status("PASS", f"Chọn đúng sản phẩm vừa thêm: {name_text}", level="Exemplary")
                        break
                        
                except Exception as e:
                    print(f"Lỗi khi xử lý item {i+1}: {e}")
                    continue

            if not matched:
                self.mark_test_status("FAIL", f"Không tìm thấy sản phẩm '{self.selected_product_name}' trong giỏ hàng", level="Below Expectation")
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
        """Chạy test case: Thanh toán đồng thời với 2 user khác nhau"""
        try:
            print("Bắt đầu test case: Thanh toán đồng thời với 2 user khác nhau")
            print("=" * 70)

            # ===== CỬA SỔ 1 - USER 1 =====
            print("\n[CỬA SỔ 1 - USER 1] Đăng nhập và chuẩn bị đơn hàng")
            if not self.login('huygiavu2003@gmail.com', '12345678'):
                return False
            
            if not self.add_products_to_cart():
                return False
            
            # Lưu tên sản phẩm mà User 1 đã chọn
            user1_product_name = self.selected_product_name
            print(f"[USER 1] Đã chọn sản phẩm: {user1_product_name}")
            
            time.sleep(1)
            if not self.open_cart_and_select_items():
                return False
            time.sleep(1)
            if not self.proceed_to_checkout():
                return False
            time.sleep(1)
            if not self.fill_shipping_info("57 Man Thiện, Hiệp Phú, Thủ Đức", "0912345678"):
                return False
            
            print("[USER 1] Đã chuẩn bị xong, tạm dừng tại trang thanh toán")

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

            # User 2 thêm cùng sản phẩm với User 1
            if not self.add_same_product_to_cart(user1_product_name):
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
            if not self.fill_shipping_info("123 Đường Test, Quận 1, TP.HCM", "0987654321"):
                user2_driver.quit()
                return False
            time.sleep(1)
            
            # User 2 thực hiện thanh toán trước
            if not self.select_payment_method_cod():
                user2_driver.quit()
                return False

            print("[USER 2] Thanh toán thành công - Đã mua hết sản phẩm")
            time.sleep(5)

            # ===== QUAY LẠI CỬA SỔ USER 1 =====
            print("\n[CỬA SỔ 1 - USER 1] Quay lại để thử thanh toán sản phẩm đã hết")
            
            # Đóng cửa sổ user 2
            user2_driver.quit()
            
            # Khôi phục driver user 1
            self.driver = user1_driver
            self.wait = user1_wait
            self.actions = user1_actions

            # User 1 thử thanh toán
            result = self.select_payment_method_cod()

            # Chờ toast phản hồi
            time.sleep(3)
            try:
                toast = self.driver.find_element(By.CLASS_NAME, "Toastify__toast-body")
                toast_text = toast.text.strip()
                
                if any(keyword in toast_text.lower() for keyword in ["không thể tạo đơn hàng", "lỗi hệ thống", "sản phẩm không còn đủ hàng"]):
                    self.mark_test_status("PASS", "USER 1 bị từ chối thanh toán như kỳ vọng - Sản phẩm đã hết", level="Exemplary")
                else:
                    
                    self.mark_test_status("INCONCLUSIVE", f"Thông báo không rõ ràng: {toast_text}", level="Developing")
            except NoSuchElementException:
                self.mark_test_status("FAIL", "USER 1 vẫn thanh toán được khi sản phẩm đã hết", level="Below Expectation")

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
        
        try:
            # Đóng tất cả các browser instance nếu có
            import psutil
            for proc in psutil.process_iter(['pid', 'name']):
                if 'chrome' in proc.info['name'].lower():
                    proc.kill()
        except:
            pass


# Chạy test
if __name__ == "__main__":
    #Tắt log TensorFlow ở mức môi trường
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
    # Instantiate the test class
    test = OverMaxQuantityOrderTest()
    try:
        success = test.run_test()
        if success:
            print("\nTEST PASSED")
        else:
            print("\nTEST FAILED")
    finally:
        test.cleanup()
