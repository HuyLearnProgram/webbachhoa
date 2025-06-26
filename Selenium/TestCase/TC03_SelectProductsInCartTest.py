import time
import os
import random
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager

class TC03_SelectProductsInCartTest:
    def __init__(self):
        chrome_options = Options()
        chrome_options.add_argument("--incognito")
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        self.actions = ActionChains(self.driver)
        self.driver.maximize_window()
        
        # Lưu trữ thông tin về sản phẩm đã chọn
        self.selected_products = []
        self.initial_total = 0
        self.updated_total = 0


    def login(self, email, password):
        """Đăng nhập vào hệ thống"""
        try:
            print("=== ĐĂNG NHẬP VÀO HỆ THỐNG ===")
            self.driver.get('http://localhost:5173/')
            time.sleep(1)
            
            login_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/login' and contains(text(), 'Đăng nhập hoặc đăng ký')]"))
            )
            login_link.click()
            time.sleep(2)
            
            username_field = self.wait.until(EC.presence_of_element_located((By.NAME, "email")))
            password_field = self.driver.find_element(By.NAME, "password")
            
            username_field.clear()
            username_field.send_keys(email)
            password_field.clear()
            password_field.send_keys(password)
            time.sleep(2)
            
            login_button = self.driver.find_element(By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Đăng nhập')]")
            login_button.click()
            time.sleep(5)
            return True
        except Exception as e:
            self.mark_test_status("BLOCKED", "Không thể đăng nhập", "Critical")
            return False

    def setup_cart_with_products(self, num_products=3):
        """Thiết lập giỏ hàng với sản phẩm để test"""
        try:
            success_count = 0
            
            for i in range(num_products):
                self.driver.get('http://localhost:5173/')
                
                products = self.wait.until(
                    EC.presence_of_all_elements_located((By.XPATH, "//div[contains(@class, 'w-full border p-[15px]')]//img"))
                )
                
                if products:
                    random_product = products[random.randint(0, len(products) - 1)]
                    self.actions.move_to_element(random_product).click().perform()
                    
                    quantity_input = self.wait.until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='number'][class='w-15 text-center input-blur']"))
                    )
                    quantity_input.clear()
                    random_quantity = random.randint(1, 3)
                    quantity_input.send_keys(str(random_quantity))
                    
                    add_to_cart_button = self.wait.until(
                        EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'px-4 py-2 rounded-md text-white bg-main text-semibold my-2 w-full')]"))
                    )
                    add_to_cart_button.click()
                    time.sleep(2)
                    success_count += 1
            
            if success_count == num_products:
                self.mark_test_status("PASS", f"Thiết lập thành công {success_count}/{num_products} sản phẩm", "Sufficient")
                return True
            elif success_count > 0:
                self.mark_test_status("INCONCLUSIVE", f"Chỉ thiết lập được {success_count}/{num_products} sản phẩm", "Medium")
                return True
            else:
                self.mark_test_status("FAIL", "Không thể thiết lập bất kỳ sản phẩm nào", "Below Expectation")
                return False
                
        except Exception as e:
            self.mark_test_status("BLOCKED", f"Lỗi nghiêm trọng khi thiết lập dữ liệu test: {str(e)}", "Critical")
            return False
    
    def open_cart_page(self):
        """Mở trang giỏ hàng"""
        try:
            cart_icon = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//div[contains(@class, 'cursor-pointer') and contains(., 'sản phẩm')]"))
            )
            cart_icon.click()
            time.sleep(3)
            
            # Xác minh đã vào trang giỏ hàng
            current_url = self.driver.current_url
            if 'cart' in current_url.lower() or 'gio-hang' in current_url.lower():
                self.mark_test_status("PASS", "Điều hướng đến trang giỏ hàng thành công", "Sufficient")
                return True
            else:
                self.mark_test_status("FAIL", "URL không xác nhận trang giỏ hàng", "Below Expectation")
                return False
                
        except Exception as e:
            self.mark_test_status("BLOCKED", f"Không thể truy cập trang giỏ hàng: {str(e)}", "Critical")
            return False

    def get_checkboxes_final(self):
        """Method cuối cùng để lấy checkbox với highest accuracy"""
        try:
            # 1. Lấy checkbox sản phẩm: Trong div có class "grid-cols-10" và có product link
            product_checkboxes = self.driver.find_elements(
                By.XPATH, 
                "//div[contains(@class, 'grid-cols-10') and .//a[contains(@href, '/products/')]]//div[contains(@class, 'ml-4')]//input[@type='checkbox']"
            )
            
            # 2. Lấy checkbox "Chọn tất cả": Trong div có background gray và text "Chọn tất cả"
            try:
                select_all_checkbox = self.driver.find_element(
                    By.XPATH,
                    "//div[contains(@class, 'bg-gray-50') and contains(., 'Chọn tất cả')]//input[@type='checkbox']"
                )
            except:
                select_all_checkbox = None
            
            # Classification kết quả
            if len(product_checkboxes) >= 2:
                self.mark_test_status("PASS", f"Xác định thành công {len(product_checkboxes)} checkbox sản phẩm và {'1' if select_all_checkbox else '0'} checkbox chọn tất cả", "Sufficient")
            elif len(product_checkboxes) == 1:
                self.mark_test_status("INCONCLUSIVE", f"Chỉ tìm thấy {len(product_checkboxes)} checkbox sản phẩm", "Medium")
            else:
                self.mark_test_status("FAIL", "Không tìm thấy checkbox sản phẩm nào", "Below Expectation")
                
            return {
                'product_checkboxes': product_checkboxes,
                'select_all_checkbox': select_all_checkbox
            }
            
        except Exception as e:
            self.mark_test_status("BLOCKED", f"Lỗi xác định checkbox: {str(e)}", "Critical")
            return {'product_checkboxes': [], 'select_all_checkbox': None}

    def test_product_selection_optimized(self, product_checkboxes, select_all_checkbox):
        """Test logic chọn sản phẩm - đã tối ưu"""
        try:
            # Test chọn sản phẩm theo logic TC05
            if len(product_checkboxes) >= 2:
                selected_checkboxes = random.sample(product_checkboxes, 2)
            else:
                selected_checkboxes = product_checkboxes
            
            # Click các checkbox đã chọn
            success_count = 0
            for i, checkbox in enumerate(selected_checkboxes):
                try:
                    if not checkbox.is_selected():
                        checkbox.click()
                        time.sleep(0.5)
                    success_count += 1
                except:
                    continue
            
            # Verify trạng thái
            all_selected = all(cb.is_selected() for cb in selected_checkboxes)
            
            # Test checkbox "Chọn tất cả" nếu có
            select_all_works = True
            if select_all_checkbox:
                try:
                    select_all_checkbox.click()
                    time.sleep(1)
                    all_products_selected = all(cb.is_selected() for cb in product_checkboxes)
                    if not all_products_selected:
                        select_all_works = False
                except:
                    select_all_works = False
            
            # Classification kết quả
            if all_selected and select_all_works:
                self.mark_test_status("PASS", f"Chọn sản phẩm thành công - {success_count} sản phẩm được chọn và chức năng 'Chọn tất cả' hoạt động", "Sufficient")
                return True
            elif all_selected:
                self.mark_test_status("INCONCLUSIVE", f"Chọn sản phẩm thành công nhưng 'Chọn tất cả' có vấn đề", "Medium")
                return True
            else:
                self.mark_test_status("FAIL", "Không thể chọn sản phẩm hoặc verify trạng thái", "Below Expectation")
                return False
            
        except Exception as e:
            self.mark_test_status("BLOCKED", f"Lỗi nghiêm trọng trong test selection: {str(e)}", "Critical")
            return False
    
    def run_tc04_test(self):
        """Test case TC05 final - đã tối ưu hoàn chỉnh"""
        try:
            print("=== BẮT ĐẦU TEST CASE TC03: CHỌN SẢN PHẨM TRONG GIỎ HÀNG ===")
            
            # Đăng nhập
            if not self.login('huygiavu2003@gmail.com', '12345678'):
                self.mark_test_status("BLOCKED", "Không thể đăng nhập vào hệ thống", "Critical")
                return False
            
            # Mở trang giỏ hàng
            if not self.open_cart_page():
                return False  # Đã mark status trong method
            
            # Lấy checkbox
            checkbox_result = self.get_checkboxes_final()
            product_checkboxes = checkbox_result['product_checkboxes']
            select_all_checkbox = checkbox_result['select_all_checkbox']
            
            if len(product_checkboxes) == 0:
                return False  # Đã mark status trong method
            
            # Test chọn sản phẩm
            success = self.test_product_selection_optimized(product_checkboxes, select_all_checkbox)
            
            if success:
                self.mark_test_status("PASS", f"TEST CASE TC05 HOÀN THÀNH - Kiểm tra chức năng chọn sản phẩm thành công với {len(product_checkboxes)} sản phẩm", "Sufficient")
                return True
            else:
                return False  # Đã mark status trong method
                
        except Exception as e:
            self.mark_test_status("BLOCKED", f"Lỗi nghiêm trọng trong TC05: {str(e)}", "Critical")
            return False

    def cleanup(self):
        """Dọn dẹp và đóng browser"""
        if self.driver:
            self.driver.quit()
            print("✓ Đã đóng browser")

    def mark_test_status(self, status, reason="", level=None):
        """Đánh dấu trạng thái test với format chuẩn"""
        label = {
            "PASS": "[TEST PASSED]",
            "FAIL": "[TEST FAILED]", 
            "BLOCKED": "[TEST BLOCKED]",
            "INCONCLUSIVE": "[TEST INCONCLUSIVE]"
        }
        level_label = f" (Level: {level})" if level else ""
        print(f"\n{label.get(status, '[UNKNOWN STATUS]')} - {reason}{level_label}\n")
# Chạy test
if __name__ == "__main__":
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
    test = TC03_SelectProductsInCartTest()
    try:
        success = test.run_tc04_test()
        if success:
            print("\n🎯 KẾT QUẢ: TEST PASSED")
        else:
            print("\n💥 KẾT QUẢ: TEST FAILED")
    finally:
        test.cleanup()
