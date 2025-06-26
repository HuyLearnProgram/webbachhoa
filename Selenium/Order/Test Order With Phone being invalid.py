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

class EcommerceOrderTest:
    def __init__(self):
        chrome_options = Options()
        chrome_options.add_argument("--incognito")
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        self.actions = ActionChains(self.driver)
    
    def login(self, email, password):
        """Đăng nhập vào hệ thống"""
        try:
            # Truy cập trang web
            self.driver.get('http://localhost:5173/')
            print("Truy cập trang web thành công")
            time.sleep(1)
            
            # Click vào liên kết đăng nhập
            login_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/login' and contains(text(), 'Đăng nhập hoặc đăng ký')]"))
            )
            login_link.click()
            print("Đã click vào liên kết đăng nhập")
            time.sleep(2)
            
            # Nhập thông tin đăng nhập
            username_field = self.wait.until(EC.presence_of_element_located((By.NAME, "email")))
            password_field = self.driver.find_element(By.NAME, "password")
            
            username_field.clear()
            username_field.send_keys(email)
            password_field.clear()
            password_field.send_keys(password)
            # print("Đã nhập thông tin đăng nhập")
            time.sleep(2)
            
            # Click nút đăng nhập
            login_button = self.driver.find_element(By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Đăng nhập')]")
            login_button.click()
            print("Đã đăng nhập")
            time.sleep(5)
            
            return True
        except Exception as e:
            print(f"Lỗi đăng nhập: {e}")
            return False
    
    def add_products_to_cart(self, num_products=3):
        """Thêm sản phẩm vào giỏ hàng"""
        try:
            print(f"Bắt đầu thêm {num_products} sản phẩm vào giỏ hàng")
            
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
                    # print(f"Đã chọn sản phẩm {i+1}")
                    
                    # Nhập số lượng ngẫu nhiên
                    quantity_input = self.wait.until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='number'][class='w-15 text-center input-blur']"))
                    )
                    quantity_input.clear()
                    random_quantity = random.randint(1, 10)
                    quantity_input.send_keys(str(random_quantity))
                    # print(f"Đã nhập số lượng: {random_quantity}")
                    
                    # Thêm vào giỏ hàng
                    add_to_cart_button = self.wait.until(
                        EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'px-4 py-2 rounded-md text-white bg-main text-semibold my-2 w-full')]"))
                    )
                    add_to_cart_button.click()
                    # print(f"Đã thêm sản phẩm {i+1} vào giỏ hàng")
            
            return True
        except Exception as e:
            print(f"Lỗi thêm sản phẩm vào giỏ hàng: {e}")
            return False
    
    def open_cart_and_select_items(self):
        """Mở giỏ hàng và chọn sản phẩm"""
        try:
            # Mở giỏ hàng
            cart_page = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'cursor-pointer') and contains(., 'sản phẩm')]"))
            )
            cart_page.click()
            print("Đã mở giỏ hàng")
            
            # Chọn sản phẩm trong giỏ hàng
            cart_items = self.wait.until(
                EC.presence_of_all_elements_located((By.XPATH, "//input[@type='checkbox']"))
            )
            
            if len(cart_items) >= 2:
                selected_items = random.sample(cart_items, 2)
                for item in selected_items:
                    item.click()
                print("Đã chọn ngẫu nhiên 2 sản phẩm trong giỏ hàng")
            elif len(cart_items) == 1:
                cart_items[0].click()
                print("Chỉ có 1 sản phẩm, đã chọn sản phẩm duy nhất")
            else:
                print("Giỏ hàng không có sản phẩm")
                return False
            
            return True
        except Exception as e:
            print(f"Lỗi mở giỏ hàng và chọn sản phẩm: {e}")
            return False
    
    def find_payment_button(self):
        """Tìm nút thanh toán bằng nhiều cách"""
        cart_payment_button = None
        
        # Cách 1: Tìm theo text chính xác
        try:
            cart_payment_button = WebDriverWait(self.driver, 5).until(
                EC.presence_of_element_located((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Thanh toán')]"))
            )
            print("Tìm thấy nút thanh toán bằng text chính xác")
        except TimeoutException:
            pass
        
        # Cách 2: Tìm theo class bg-main
        if not cart_payment_button:
            try:
                buttons_with_bg_main = self.driver.find_elements(By.XPATH, "//button[contains(@class, 'bg-main')]")
                for button in buttons_with_bg_main:
                    if "thanh toán" in button.text.lower():
                        cart_payment_button = button
                        print("Tìm thấy nút thanh toán bằng class bg-main")
                        break
            except Exception as e:
                pass
        
        # Cách 3: Tìm theo text không phân biệt hoa thường
        if not cart_payment_button:
            try:
                cart_payment_button = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Thanh toán')]"))
                )
                print("Tìm thấy nút thanh toán bằng text không phân biệt hoa thường")
            except NoSuchElementException:
                pass
        
        # Cách 4: Cuộn xuống trước khi tìm
        if not cart_payment_button:
            print("Thử cuộn xuống trước khi tìm nút")
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            try:
                cart_payment_button = WebDriverWait(self.driver, 5).until(
                    EC.presence_of_element_located((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Thanh toán')]"))
                )
                print("Tìm thấy nút thanh toán sau khi cuộn xuống")
            except TimeoutException:
                pass
        
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
                        print("Đã nhấn nút thanh toán thành công bằng Selenium")
                    except:
                        self.driver.execute_script("arguments[0].click();", cart_payment_button)
                        print("Đã nhấn nút thanh toán thành công bằng JavaScript")
                    
                    return True
                else:
                    print("Nút thanh toán không thể click được")
                    return False
            else:
                print("KHÔNG TÌM THẤY NÚT THANH TOÁN!")
                return False
                
        except Exception as e:
            print(f"Lỗi khi nhấn nút thanh toán: {e}")
            return False
    
    def fill_shipping_info(self, address, phone):
        """Điền thông tin giao hàng"""
        try:
            # Điền địa chỉ
            address_field = self.wait.until(EC.presence_of_element_located((By.ID, "address")))
            address_field.clear()
            address_field.send_keys(address)
            print("Đã điền địa chỉ")
            
            # Điền số điện thoại
            phone_field = self.wait.until(EC.presence_of_element_located((By.ID, "phone")))
            phone_field.clear()
            phone_field.send_keys(phone)
            print("Đã điền số điện thoại")
            
            return True
        except Exception as e:
            print(f"Lỗi điền thông tin giao hàng: {e}")
            return False
    
    def select_payment_method(self, method="cod"):
        """Chọn phương thức thanh toán"""
        try:
            if method == "cod":
                # Nhấn nút "Thanh toán khi nhận hàng"
                payment_button = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-green-600') and contains(text(), 'Thanh toán khi nhận hàng')]"))
                )
                payment_button.click()
                print("Đã chọn thanh toán khi nhận hàng")
            elif method == "vnpay":
                # Nhấn nút thanh toán bằng VNPAY
                vnpay_payment_button = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-blue-600') and contains(text(), 'Thanh toán bằng VNPAY')]"))
                )
                vnpay_payment_button.click()
                print("Đã chọn thanh toán bằng VNPAY")
            
            return True
        except Exception as e:
            print(f"Lỗi chọn phương thức thanh toán: {e}")
            return False
    
    def run_test(self):
        """Chạy test case chính"""
        try:
            print("Bắt đầu test case: Quy trình mua hàng hoàn chỉnh")
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
            if not self.fill_shipping_info("57 Man Thiện, Phường Hiệp Phú, Quận Thủ Đức, Sài Gòn", "0912345678qp"):
                return False
            
            # Bước 6: Chọn phương thức thanh toán
            if not self.select_payment_method("cod"):
                return False
            
            print("-" * 50)
            print("Test case hoàn thành thành công!")
            time.sleep(7)
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
    test = EcommerceOrderTest()
    try:
        success = test.run_test()
        if success:
            print("\nTEST PASSED")
        else:
            print("\nTEST FAILED")
    finally:
        test.cleanup()
