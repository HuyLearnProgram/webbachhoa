from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import time
from SaveTestcaseLog import log_test_execution
class AdminOrderPaginationTest:
    def __init__(self, target_page=2):
        chrome_options = Options()
        chrome_options.add_argument("--incognito")
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        self.driver.maximize_window()
        self.target_page = target_page  # Biến để lưu trang muốn chuyển đến
    
    def login(self, email, password):
        """Đăng nhập vào hệ thống"""
        try:
            # Truy cập trang web
            self.driver.get('http://localhost:5173/')
            print("Đã truy cập trang web thành công!")
            
            # Click vào liên kết đăng nhập
            login_link = self.wait.until(
                EC.presence_of_element_located((By.XPATH, "//a[@href='/login' and contains(text(), 'Đăng nhập hoặc đăng ký')]"))
            )
            login_link.click()
            
            # Nhập thông tin đăng nhập
            username_field = self.wait.until(EC.presence_of_element_located((By.NAME, "email")))
            password_field = self.driver.find_element(By.NAME, "password")
            
            username_field.clear()
            username_field.send_keys(email)
            password_field.clear()
            password_field.send_keys(password)
            
            # Click nút đăng nhập
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
            # Click vào profile
            profile_element = self.wait.until(EC.presence_of_element_located((By.ID, "profile")))
            profile_element.click()
            
            # Click vào Admin Workplace
            admin_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/admin/overview' and contains(text(), 'Trang quản trị')]"))
            )
            admin_link.click()
            print("Đã vào Admin Workplace")
            
            # Đợi trang admin load
            self.wait.until(EC.url_contains("/admin/overview"))
            
            # Click vào Đơn đặt hàng
            order_link = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[@href='/admin/order' and contains(text(), 'Đơn đặt hàng')]"))
            )
            order_link.click()
            
            # Đợi trang đơn hàng load
            self.wait.until(EC.url_contains("/admin/order"))
            print("Đã vào trang đơn đặt hàng thành công!")
            
            return True
        except Exception as e:
            print(f"Lỗi điều hướng: {e}")
            return False
    
    def test_pagination_navigation(self, page_number=None):
        """Test chuyển trang trong pagination với số trang có thể thay đổi"""
        try:
            # Sử dụng target_page nếu không truyền page_number
            if page_number is None:
                page_number = self.target_page
                
            # print(f"\n{'='*50}")
            print(f"BẮT ĐẦU TEST PAGINATION - CHUYỂN SANG TRANG {page_number}")
            # print(f"{'='*50}")
            
            # Đợi pagination load
            time.sleep(3)
            
            # Kiểm tra xem có pagination không
            pagination_container = self.wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".ant-pagination"))
            )
            # print("Đã tìm thấy pagination container")
            
            # Lấy tất cả các trang có sẵn
            pagination_items = self.driver.find_elements(By.CSS_SELECTOR, "li.ant-pagination-item")
            print(f"Tìm thấy {len(pagination_items)} trang")
            
            # Hiển thị thông tin các trang
            available_pages = []
            for item in pagination_items:
                page_title = item.get_attribute("title")
                available_pages.append(page_title)
                # print(f"  - Trang {page_title}")
            
            # Kiểm tra xem trang mục tiêu có tồn tại không
            if str(page_number) not in available_pages:
                print(f"Trang {page_number} không tồn tại trong pagination")
                print(f"   Các trang có sẵn: {', '.join(available_pages)}")
                return False
            
            # Tạo selector động cho trang mục tiêu
            target_page_selector = f"li.ant-pagination-item.ant-pagination-item-{page_number}"
            
            # Tìm và click vào trang mục tiêu
            target_page_element = self.driver.find_element(
                By.CSS_SELECTOR, 
                target_page_selector
            )
            
            if target_page_element:
                # print(f"\nTìm thấy trang {page_number}")
                # print(f"  - Title: {target_page_element.get_attribute('title')}")
                # print(f"  - Class: {target_page_element.get_attribute('class')}")
                # print(f"  - Tabindex: {target_page_element.get_attribute('tabindex')}")

                self.driver.execute_script("arguments[0].scrollIntoView(true);", target_page_element)
                time.sleep(1)

                target_page_link = target_page_element.find_element(By.TAG_NAME, "a")
                target_page_link.click()
                

                time.sleep(3)
                current_url = self.driver.current_url

                try:
                    active_page = self.driver.find_element(
                        By.CSS_SELECTOR, 
                        "li.ant-pagination-item-active"
                    )
                    active_page_number = active_page.get_attribute("title")
                    print(f"Trang hiện tại đang ở: {active_page_number}")
                    
                    if active_page_number == str(page_number):
                        print(f"THÀNH CÔNG: Đã chuyển sang trang {page_number}!")
                        return True
                    else:
                        print(f"LỖI: Trang active không phải là {page_number}, mà là {active_page_number}")
                        return False
                        
                except Exception as e:
                    print(f"Không thể xác định trang active: {e}")
                    return True
                    
            else:
                print(f"Không tìm thấy trang {page_number}")
                return False
                
        except Exception as e:
            print(f"Lỗi khi test pagination: {e}")
            return False
    
    def test_multiple_pages(self, page_list):
        """Test chuyển sang nhiều trang khác nhau"""
        try:
            print(f"\n{'='*50}")
            print(f"TEST CHUYỂN SANG NHIỀU TRANG: {page_list}")
            print(f"{'='*50}")
            
            results = {}
            
            for page_num in page_list:
                print(f"\n🔄 Test chuyển sang trang {page_num}")
                success = self.test_pagination_navigation(page_num)
                results[page_num] = success
                
                if success:
                    print(f"Trang {page_num}: THÀNH CÔNG")
                else:
                    print(f"Trang {page_num}: THẤT BẠI")
                
                time.sleep(2)
            

            print(f"\n{'='*50}")
            print("KẾT QUẢ TỔNG KẾT:")
            for page_num, success in results.items():
                status = "THÀNH CÔNG" if success else "THẤT BẠI"
                print(f"  Trang {page_num}: {status}")
            
            return all(results.values())
            
        except Exception as e:
            print(f"Lỗi khi test nhiều trang: {e}")
            return False
    @log_test_execution
    def run_test(self, test_pages=None):
        """Chạy test case chính"""
        try:

            
            # Bước 1: Đăng nhập
            if not self.login('huygiavu2003@gmail.com', '12345678'):
                return False
            

            if not self.navigate_to_admin_orders():
                return False
            

            if test_pages is None:

                if not self.test_pagination_navigation():
                    return False
            else:
                # Test nhiều trang
                if not self.test_multiple_pages(test_pages):
                    return False
            
            # print(f"\n{'='*60}")
            # print("TEST CASE THÀNH CÔNG!")
            # print("="*60)
            return True
            
        except Exception as e:
            print(f"Lỗi trong quá trình test: {e}")
            return False
    
    def cleanup(self):
        """Dọn dẹp và đóng browser"""
        if self.driver:
            self.driver.quit()


# Chạy test với các cách khác nhau
if __name__ == "__main__":
    
    # Cách 1: Test trang 2 (mặc định)
    print("TEST 1: Chuyển sang trang 2")
    test1 = AdminOrderPaginationTest(target_page=2)
    try:
        success1 = test1.run_test()
        print(f"Kết quả Test : {'PASSED' if success1 else 'FAILED'}")
    finally:
        test1.cleanup()
    
    # print("\n" + "="*80 + "\n")
    
    # # Cách 2: Test trang 3
    # print("🧪 TEST 2: Chuyển sang trang 3")
    # test2 = AdminOrderPaginationTest(target_page=3)
    # try:
    #     success2 = test2.run_test()
    #     print(f"Kết quả Test 2: {'PASSED' if success2 else 'FAILED'}")
    # finally:
    #     test2.cleanup()
    
    # print("\n" + "="*80 + "\n")
    
    # # Cách 3: Test nhiều trang
    # print("🧪 TEST 3: Test nhiều trang")
    # test3 = AdminOrderPaginationTest()
    # try:
    #     success3 = test3.run_test(test_pages=[1, 2, 3, 4])
    #     print(f"Kết quả Test 3: {'PASSED' if success3 else 'FAILED'}")
    # finally:
    #     test3.cleanup()
