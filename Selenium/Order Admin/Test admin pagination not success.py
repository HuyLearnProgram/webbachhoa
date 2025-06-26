
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
from SaveTestcaseLog import log_test_execution
class AdminOrderPaginationNonSuccessTest:
    def __init__(self, target_page=999):
        chrome_options = Options()
        chrome_options.add_argument("--incognito")
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        self.driver.maximize_window()
        self.target_page = target_page
    
    def login(self, email, password):
        """Đăng nhập vào hệ thống"""
        try:
            self.driver.get('http://localhost:5173/')
            print("Đã truy cập trang web thành công!")
            
            login_link = self.wait.until(
                EC.presence_of_element_located((By.XPATH, "//a[@href='/login' and contains(text(), 'Đăng nhập hoặc đăng ký')]"))
            )
            login_link.click()
            
            username_field = self.wait.until(EC.presence_of_element_located((By.NAME, "email")))
            password_field = self.driver.find_element(By.NAME, "password")
            
            username_field.clear()
            username_field.send_keys(email)
            password_field.clear()
            password_field.send_keys(password)
            
            login_button = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Đăng nhập')]"))
            )
            login_button.click()
            time.sleep(5)
            print("Đã đăng nhập")
            
            return True
        except Exception as e:
            print(f"Lỗi đăng nhập: {e}")
            return False
    
    def navigate_to_admin_orders(self):
        """Điều hướng đến trang quản lý đơn hàng"""
        try:
            profile_element = self.wait.until(EC.presence_of_element_located((By.ID, "profile")))
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
    
    def test_pagination_non_success(self, page_number=None):
        """Test chuyển trang thất bại với trang không tồn tại"""
        try:
            if page_number is None:
                page_number = self.target_page
                
            print(f"BẮT ĐẦU TEST PAGINATION THẤT BẠI - TRANG {page_number}")
            
            time.sleep(3)
            
            try:
                pagination_container = self.wait.until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".ant-pagination"))
                )
                print("Đã tìm thấy pagination container")
            except Exception as e:
                print(f"Không tìm thấy pagination container: {e}")
                return True
            
            pagination_items = self.driver.find_elements(By.CSS_SELECTOR, "li.ant-pagination-item")
            # print(f"Tìm thấy {len(pagination_items)} trang có sẵn")
            
            available_pages = []
            for item in pagination_items:
                page_title = item.get_attribute("title")
                available_pages.append(page_title)
                # print(f"  - Trang {page_title}")
            
            print(f"Đang thử truy cập trang {page_number}...")
            
            if str(page_number) not in available_pages:
                print(f"THÀNH CÔNG: Trang {page_number} không tồn tại như mong đợi!")
                print(f"Các trang có sẵn: {', '.join(available_pages)}")
                # print(f"   Trang {page_number} không có trong danh sách")
                
                target_page_selector = f"li.ant-pagination-item.ant-pagination-item-{page_number}"
                
                try:
                    target_page_element = self.driver.find_element(By.CSS_SELECTOR, target_page_selector)
                    print(f"BẤT NGỜ: Tìm thấy element trang {page_number} trong DOM!")
                    return False
                except Exception:
                    print(f"XÁC NHẬN: Element trang {page_number} không tồn tại trong trang")
                    return True
            else:
                print(f"THẤT BẠI: Trang {page_number} tồn tại trong pagination!")
                print(f"   Test này mong đợi trang {page_number} KHÔNG tồn tại")
                return False
                
        except Exception as e:
            print(f"Lỗi khi test pagination thất bại: {e}")
            return False
    
    def test_multiple_non_existing_pages(self, page_list):
        """Test chuyển sang nhiều trang không tồn tại"""
        try:
            print(f"TEST NHIỀU TRANG KHÔNG TỒN TẠI: {page_list}")
            
            results = {}
            
            for page_num in page_list:
                print(f"Test trang không tồn tại: {page_num}")
                success = self.test_pagination_non_success(page_num)
                results[page_num] = success
                
                if success:
                    print(f"Trang {page_num}: THÀNH CÔNG (không tồn tại như mong đợi)")
                else:
                    print(f"Trang {page_num}: THẤT BẠI (tồn tại khi không mong đợi)")
                
                time.sleep(1)
            
            print("KẾT QUẢ TỔNG KẾT:")
            success_count = 0
            for page_num, success in results.items():
                status = "THÀNH CÔNG" if success else "THẤT BẠI"
                print(f"  Trang {page_num}: {status}")
                if success:
                    success_count += 1
            
            print(f"Thống kê: {success_count}/{len(page_list)} trang test thành công")
            
            return all(results.values())
            
        except Exception as e:
            print(f"Lỗi khi test nhiều trang: {e}")
            return False
    @log_test_execution
    def run_test(self, test_pages=None):
        """Chạy test case chính - Test thất bại pagination"""
        try:
            print("BẮT ĐẦU TEST CASE: PAGINATION NON-SUCCESS TEST")
            print("Mục tiêu: Kiểm tra hệ thống xử lý đúng khi truy cập trang không tồn tại")

            if not self.login('huygiavu2003@gmail.com', '12345678'):
                return False
            
            print("BƯỚC 2: Điều hướng đến trang quản lý đơn hàng")
            if not self.navigate_to_admin_orders():
                print("Điều hướng thất bại!")
                return False
            
            print("BƯỚC 3: Test pagination với trang không tồn tại")
            if test_pages is None:
                if not self.test_pagination_non_success():
                    print("Test pagination thất bại!")
                    return False
            else:
                if not self.test_multiple_non_existing_pages(test_pages):
                    print("Test nhiều trang thất bại!")
                    return False
            
            # print("TEST CASE HOÀN THÀNH THÀNH CÔNG!")
            # print("Hệ thống xử lý đúng các trang không tồn tại")
            return True
            
        except Exception as e:
            print(f"Lỗi trong quá trình test: {e}")
            return False
    
    def cleanup(self):
        """Dọn dẹp và đóng browser"""
        if self.driver:
            self.driver.quit()
            # print("Đã đóng browser")

    
if __name__ == "__main__":
    test = AdminOrderPaginationNonSuccessTest(target_page=999)
    try:
        success = test.run_test()
        if success:
            print("\nTEST PASSED")
        else:
            print("\nTEST FAILED")
    finally:
        test.cleanup()
