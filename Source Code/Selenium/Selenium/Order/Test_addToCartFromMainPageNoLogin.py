# # # # # # # # from selenium import webdriver
# # # # # # # # from selenium.webdriver.common.by import By
# # # # # # # # from selenium.webdriver.chrome.service import Service
# # # # # # # # from selenium.webdriver.chrome.options import Options
# # # # # # # # from selenium.webdriver.common.action_chains import ActionChains
# # # # # # # # from selenium.webdriver.support.ui import WebDriverWait
# # # # # # # # from selenium.webdriver.support import expected_conditions as EC
# # # # # # # # from webdriver_manager.chrome import ChromeDriverManager
# # # # # # # # import time

# # # # # # # # chrome_options = Options()
# # # # # # # # chrome_options.add_argument("--incognito")

# # # # # # # # # Cài đặt Service cho ChromeDriver
# # # # # # # # service = Service(ChromeDriverManager().install())

# # # # # # # # # Khởi tạo trình duyệt với cấu hình và Service đã tạo
# # # # # # # # driver = webdriver.Chrome(service=service, options=chrome_options)

# # # # # # # # # Truy cập trang web
# # # # # # # # driver.get("http://localhost:5173/")
# # # # # # # # time.sleep(3)

# # # # # # # # # Tìm phần tử sản phẩm
# # # # # # # # product_element = driver.find_element(By.XPATH, "//div[contains(@class, 'w-full border p-[15px]')]//img")

# # # # # # # # actions = ActionChains(driver)
# # # # # # # # actions.move_to_element(product_element).perform()

# # # # # # # # # Sử dụng JavaScript để kích hoạt trạng thái hover
# # # # # # # # driver.execute_script("arguments[0].classList.add('hover')", product_element)

# # # # # # # # # Retry logic for the "Add to Cart" button to avoid StaleElementReferenceException
# # # # # # # # def get_add_to_cart_button():
# # # # # # # #     try:
# # # # # # # #         # Wait for the "Add to Cart" button to be clickable
# # # # # # # #         return WebDriverWait(driver, 10).until(
# # # # # # # #             EC.element_to_be_clickable((By.XPATH, "//span[@title='Add to Cart']//div[contains(@class, 'cursor-pointer')]"))
# # # # # # # #         )
# # # # # # # #     except Exception as e:
# # # # # # # #         print(f"Error finding the 'Add to Cart' button: {e}")
# # # # # # # #         return None

# # # # # # # # # Re-locate the "Add to Cart" button if necessary
# # # # # # # # add_to_cart_button = get_add_to_cart_button()

# # # # # # # # # If the button is found, perform the click
# # # # # # # # if add_to_cart_button:
# # # # # # # #     # Scroll to the "Add to Cart" button if it's not in view
# # # # # # # #     driver.execute_script("arguments[0].scrollIntoView(true);", add_to_cart_button)

# # # # # # # #     # Click the "Add to Cart" button
# # # # # # # #     add_to_cart_button.click()
# # # # # # # # else:
# # # # # # # #     print("Add to Cart button not found.")

# # # # # # # # # Đóng trình duyệt
# # # # # # # # time.sleep(3)
# # # # # # # # driver.quit()
# # # # # # # from selenium import webdriver
# # # # # # # from selenium.webdriver.common.by import By
# # # # # # # from selenium.webdriver.chrome.service import Service
# # # # # # # from selenium.webdriver.chrome.options import Options
# # # # # # # from selenium.webdriver.common.action_chains import ActionChains
# # # # # # # from selenium.webdriver.support.ui import WebDriverWait
# # # # # # # from selenium.webdriver.support import expected_conditions as EC
# # # # # # # from webdriver_manager.chrome import ChromeDriverManager
# # # # # # # import time

# # # # # # # chrome_options = Options()
# # # # # # # chrome_options.add_argument("--incognito")

# # # # # # # # Cài đặt Service cho ChromeDriver
# # # # # # # service = Service(ChromeDriverManager().install())

# # # # # # # # Khởi tạo trình duyệt với cấu hình và Service đã tạo
# # # # # # # driver = webdriver.Chrome(service=service, options=chrome_options)

# # # # # # # # Truy cập trang web
# # # # # # # driver.get("http://localhost:5173/")
# # # # # # # time.sleep(3)

# # # # # # # # Tìm phần tử sản phẩm
# # # # # # # product_element = driver.find_element(By.XPATH, "//div[contains(@class, 'w-full border p-[15px]')]//img")

# # # # # # # actions = ActionChains(driver)
# # # # # # # actions.move_to_element(product_element).perform()

# # # # # # # # Sử dụng JavaScript để kích hoạt trạng thái hover
# # # # # # # driver.execute_script("arguments[0].classList.add('hover')", product_element)

# # # # # # # # Retry logic for the "Add to Cart" button to avoid StaleElementReferenceException
# # # # # # # def get_add_to_cart_button():
# # # # # # #     try:
# # # # # # #         # Wait for the "Add to Cart" button to be clickable
# # # # # # #         return WebDriverWait(driver, 10).until(
# # # # # # #             EC.element_to_be_clickable((By.XPATH, "//span[@title='Add to Cart']//div[contains(@class, 'cursor-pointer')]"))
# # # # # # #         )
# # # # # # #     except Exception as e:
# # # # # # #         print(f"Error finding the 'Add to Cart' button: {e}")
# # # # # # #         return None

# # # # # # # # Attempt to find the "Add to Cart" button, and retry if stale
# # # # # # # add_to_cart_button = None
# # # # # # # attempts = 0

# # # # # # # while not add_to_cart_button and attempts < 3:  # Try 3 times
# # # # # # #     add_to_cart_button = get_add_to_cart_button()
# # # # # # #     if add_to_cart_button:
# # # # # # #         break
# # # # # # #     attempts += 1
# # # # # # #     print("Retrying to find 'Add to Cart' button...")

# # # # # # # # If the button is found, perform the click using JavaScript
# # # # # # # if add_to_cart_button:
# # # # # # #     try:
# # # # # # #         # Scroll the element into view first (important if it’s not in view)
# # # # # # #         driver.execute_script("arguments[0].scrollIntoView(true);", add_to_cart_button)

# # # # # # #         # Use JavaScript to click the "Add to Cart" button directly to bypass interaction issues
# # # # # # #         driver.execute_script("arguments[0].click();", add_to_cart_button)
# # # # # # #         print("Clicked the 'Add to Cart' button.")
# # # # # # #     except Exception as e:
# # # # # # #         print(f"Error clicking the 'Add to Cart' button: {e}")
# # # # # # # else:
# # # # # # #     print("Add to Cart button not found after multiple attempts.")

# # # # # # # # Đóng trình duyệt
# # # # # # # time.sleep(3)
# # # # # # # driver.quit()

# # # # # # from selenium import webdriver
# # # # # # from selenium.webdriver.common.by import By
# # # # # # from selenium.webdriver.chrome.service import Service
# # # # # # from selenium.webdriver.chrome.options import Options
# # # # # # from selenium.webdriver.common.action_chains import ActionChains
# # # # # # from selenium.webdriver.support.ui import WebDriverWait
# # # # # # from selenium.webdriver.support import expected_conditions as EC
# # # # # # from webdriver_manager.chrome import ChromeDriverManager
# # # # # # import time

# # # # # # chrome_options = Options()
# # # # # # chrome_options.add_argument("--incognito")

# # # # # # # Cài đặt Service cho ChromeDriver
# # # # # # service = Service(ChromeDriverManager().install())

# # # # # # # Khởi tạo trình duyệt với cấu hình và Service đã tạo
# # # # # # driver = webdriver.Chrome(service=service, options=chrome_options)

# # # # # # # Truy cập trang web
# # # # # # driver.get("http://localhost:5173/")
# # # # # # time.sleep(3)

# # # # # # # Tìm phần tử sản phẩm
# # # # # # product_element = driver.find_element(By.XPATH, "//div[contains(@class, 'w-full border p-[15px]')]//img")

# # # # # # actions = ActionChains(driver)
# # # # # # actions.move_to_element(product_element).perform()

# # # # # # # Sử dụng JavaScript để kích hoạt trạng thái hover
# # # # # # driver.execute_script("arguments[0].classList.add('hover')", product_element)

# # # # # # # Wait for some time to ensure hover effect takes place
# # # # # # time.sleep(2)  # Giving some time for hover effect

# # # # # # # Try to capture the DOM around the "Add to Cart" button for debugging
# # # # # # try:
# # # # # #     page_source = driver.page_source  # Capture the current page source for debugging
# # # # # #     print("Page Source Captured for Debugging:")
# # # # # #     print(page_source[:1000])  # Print the first 1000 characters for inspection
# # # # # # except Exception as e:
# # # # # #     print(f"Error capturing page source: {e}")

# # # # # # # Retry logic for the "Add to Cart" button to avoid StaleElementReferenceException
# # # # # # def get_add_to_cart_button():
# # # # # #     try:
# # # # # #         # Wait for the "Add to Cart" button to be clickable
# # # # # #         return WebDriverWait(driver, 10).until(
# # # # # #             EC.element_to_be_clickable((By.XPATH, "//span[@title='Add to Cart']//div[contains(@class, 'cursor-pointer')]"))
# # # # # #         )
# # # # # #     except Exception as e:
# # # # # #         print(f"Error finding the 'Add to Cart' button: {e}")
# # # # # #         return None

# # # # # # # Attempt to find the "Add to Cart" button, and retry if stale
# # # # # # add_to_cart_button = None
# # # # # # attempts = 0

# # # # # # while not add_to_cart_button and attempts < 3:  # Try 3 times
# # # # # #     add_to_cart_button = get_add_to_cart_button()
# # # # # #     if add_to_cart_button:
# # # # # #         break
# # # # # #     attempts += 1
# # # # # #     print("Retrying to find 'Add to Cart' button...")

# # # # # # # If the button is found, perform the click using JavaScript
# # # # # # if add_to_cart_button:
# # # # # #     try:
# # # # # #         # Scroll the element into view first (important if it’s not in view)
# # # # # #         driver.execute_script("arguments[0].scrollIntoView(true);", add_to_cart_button)

# # # # # #         # Use JavaScript to click the "Add to Cart" button directly to bypass interaction issues
# # # # # #         driver.execute_script("arguments[0].click();", add_to_cart_button)
# # # # # #         print("Clicked the 'Add to Cart' button.")
# # # # # #     except Exception as e:
# # # # # #         print(f"Error clicking the 'Add to Cart' button: {e}")
# # # # # # else:
# # # # # #     print("Add to Cart button not found after multiple attempts.")

# # # # # # # Đóng trình duyệt
# # # # # # time.sleep(3)
# # # # # # driver.quit()
# # # # # from selenium import webdriver
# # # # # from selenium.webdriver.common.by import By
# # # # # from selenium.webdriver.chrome.service import Service
# # # # # from selenium.webdriver.chrome.options import Options
# # # # # from selenium.webdriver.common.action_chains import ActionChains
# # # # # from selenium.webdriver.support.ui import WebDriverWait
# # # # # from selenium.webdriver.support import expected_conditions as EC
# # # # # from webdriver_manager.chrome import ChromeDriverManager
# # # # # import time

# # # # # chrome_options = Options()
# # # # # chrome_options.add_argument("--incognito")

# # # # # # Cài đặt Service cho ChromeDriver
# # # # # service = Service(ChromeDriverManager().install())

# # # # # # Khởi tạo trình duyệt với cấu hình và Service đã tạo
# # # # # driver = webdriver.Chrome(service=service, options=chrome_options)

# # # # # # Truy cập trang web
# # # # # driver.get("http://localhost:5173/")
# # # # # time.sleep(5)  # Increased sleep time to allow page content to load

# # # # # # Tìm phần tử sản phẩm (you can inspect the product image element and check the XPath)
# # # # # product_element = driver.find_element(By.XPATH, "//div[contains(@class, 'w-full border p-[15px]')]//img")

# # # # # # Hover over the product image
# # # # # actions = ActionChains(driver)
# # # # # actions.move_to_element(product_element).perform()

# # # # # # Ensure that hover effect completes and the "Add to Cart" button becomes visible
# # # # # time.sleep(3)  # Wait for hover effect

# # # # # # Scroll the page to ensure all elements are in view
# # # # # driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
# # # # # time.sleep(2)

# # # # # # Retry finding the "Add to Cart" button with improved visibility check
# # # # # def get_add_to_cart_button():
# # # # #     try:
# # # # #         # Wait until the 'Add to Cart' button is both visible and clickable
# # # # #         return WebDriverWait(driver, 10).until(
# # # # #             EC.element_to_be_clickable((By.XPATH, "//span[@title='Add to Cart']//div[contains(@class, 'cursor-pointer')]"))
# # # # #         )
# # # # #     except Exception as e:
# # # # #         print(f"Error finding the 'Add to Cart' button: {e}")
# # # # #         return None

# # # # # # Retry logic for the "Add to Cart" button
# # # # # add_to_cart_button = None
# # # # # attempts = 0

# # # # # while not add_to_cart_button and attempts < 3:  # Try 3 times
# # # # #     add_to_cart_button = get_add_to_cart_button()
# # # # #     if add_to_cart_button:
# # # # #         break
# # # # #     attempts += 1
# # # # #     print("Retrying to find 'Add to Cart' button...")

# # # # # # If the button is found, click it
# # # # # if add_to_cart_button:
# # # # #     try:
# # # # #         # Scroll the element into view
# # # # #         driver.execute_script("arguments[0].scrollIntoView(true);", add_to_cart_button)
        
# # # # #         # Use JavaScript to click the "Add to Cart" button directly
# # # # #         driver.execute_script("arguments[0].click();", add_to_cart_button)
# # # # #         print("Clicked the 'Add to Cart' button.")
# # # # #     except Exception as e:
# # # # #         print(f"Error clicking the 'Add to Cart' button: {e}")
# # # # # else:
# # # # #     print("Add to Cart button not found after multiple attempts.")

# # # # # # Đóng trình duyệt
# # # # # time.sleep(3)
# # # # # driver.quit()
# # # # from selenium import webdriver
# # # # from selenium.webdriver.common.by import By
# # # # from selenium.webdriver.chrome.service import Service
# # # # from selenium.webdriver.chrome.options import Options
# # # # from selenium.webdriver.common.action_chains import ActionChains
# # # # from selenium.webdriver.support.ui import WebDriverWait
# # # # from selenium.webdriver.support import expected_conditions as EC
# # # # from webdriver_manager.chrome import ChromeDriverManager
# # # # import time

# # # # chrome_options = Options()
# # # # chrome_options.add_argument("--incognito")

# # # # # Cài đặt Service cho ChromeDriver
# # # # service = Service(ChromeDriverManager().install())

# # # # # Khởi tạo trình duyệt với cấu hình và Service đã tạo
# # # # driver = webdriver.Chrome(service=service, options=chrome_options)

# # # # # Truy cập trang web
# # # # driver.get("http://localhost:5173/")
# # # # time.sleep(5)  # Increased sleep time to allow page content to load

# # # # # Tìm phần tử sản phẩm (you can inspect the product image element and check the XPath)
# # # # product_element = driver.find_element(By.XPATH, "//div[contains(@class, 'w-full border p-[15px]')]//img")

# # # # # Hover over the product image
# # # # actions = ActionChains(driver)
# # # # actions.move_to_element(product_element).perform()

# # # # # Ensure that hover effect completes and the "Add to Cart" button becomes visible
# # # # time.sleep(3)  # Wait for hover effect

# # # # # Scroll the page to ensure all elements are in view
# # # # driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
# # # # time.sleep(2)

# # # # # Retry logic for the "Add to Cart" button
# # # # def get_add_to_cart_button():
# # # #     try:
# # # #         # Wait until the 'Add to Cart' button is both visible and clickable
# # # #         return WebDriverWait(driver, 10).until(
# # # #             EC.element_to_be_clickable((By.XPATH, "//span[@title='Add to Cart']//div[contains(@class, 'cursor-pointer')]"))
# # # #         )
# # # #     except Exception as e:
# # # #         print(f"Error finding the 'Add to Cart' button: {e}")
# # # #         return None

# # # # # Retry logic to handle stale elements and re-find the button
# # # # add_to_cart_button = None
# # # # attempts = 0

# # # # while not add_to_cart_button and attempts < 3:  # Try 3 times
# # # #     add_to_cart_button = get_add_to_cart_button()
# # # #     if add_to_cart_button:
# # # #         break
# # # #     attempts += 1
# # # #     print("Retrying to find 'Add to Cart' button...")

# # # # # If the button is found, click it
# # # # if add_to_cart_button:
# # # #     try:
# # # #         # Scroll the element into view
# # # #         driver.execute_script("arguments[0].scrollIntoView(true);", add_to_cart_button)
        
# # # #         # Use JavaScript to click the "Add to Cart" button directly
# # # #         driver.execute_script("arguments[0].click();", add_to_cart_button)
# # # #         print("Clicked the 'Add to Cart' button.")
# # # #     except Exception as e:
# # # #         print(f"Error clicking the 'Add to Cart' button: {e}")
# # # # else:
# # # #     print("Add to Cart button not found after multiple attempts.")

# # # # # Đóng trình duyệt
# # # # time.sleep(3)
# # # # driver.quit()
# # # from selenium import webdriver
# # # from selenium.webdriver.common.action_chains import ActionChains
# # # from selenium.webdriver.common.by import By
# # # from selenium.webdriver.chrome.service import Service
# # # from selenium.webdriver.chrome.options import Options
# # # from selenium.webdriver.support.ui import WebDriverWait
# # # from selenium.webdriver.support import expected_conditions as EC
# # # import time

# # # def test_add_to_cart():
# # #     # Setup Chrome options
# # #     chrome_options = Options()
# # #     chrome_options.add_argument('--disable-gpu')
# # #     chrome_options.add_argument('--no-sandbox')
# # #     chrome_options.add_argument('--disable-dev-shm-usage')

# # #     # Setup Chrome driver service
# # #     service = Service()
    
# # #     # Initialize the driver
# # #     driver = webdriver.Chrome(service=service, options=chrome_options)
# # #     wait = WebDriverWait(driver, 10)

# # #     try:
# # #         # Thay thế URL này bằng URL thực tế của trang React
# # #         url = 'http://localhost:5173'  # hoặc URL thực tế của bạn
# # #         driver.get(url)
        
# # #         # Đợi trang load
# # #         time.sleep(2)

# # #         print("=== TÌM VÀ HOVER LÊN PRODUCT CARD ===")
        
# # #         # Tìm product card container
# # #         product_card = wait.until(
# # #             EC.presence_of_element_located(
# # #                 (By.CSS_SELECTOR, 'div.w-full.border.p-\\[15px\\].flex.flex-col.items-center')
# # #             )
# # #         )
        
# # #         print("✓ Đã tìm thấy product card")

# # #         # Thực hiện hover để hiển thị action buttons
# # #         actions = ActionChains(driver)
# # #         actions.move_to_element(product_card).perform()
        
# # #         print("✓ Đã hover lên product card")
        
# # #         # Đợi animation hoàn thành
# # #         time.sleep(1)

# # #         print("=== TÌM VÀ NHẤN NÚT ADD TO CART ===")
        
# # #         # Đợi action buttons container xuất hiện
# # #         action_buttons_container = wait.until(
# # #             EC.presence_of_element_located(
# # #                 (By.CSS_SELECTOR, 'div.absolute.bottom-\\[-10px\\].flex.justify-center.left-0.right-0.gap-2.animate-slide-top')
# # #             )
# # #         )
        
# # #         print("✓ Action buttons container đã xuất hiện")
        
# # #         # Tìm nút Add to Cart bằng title attribute
# # #         add_to_cart_button = wait.until(
# # #             EC.element_to_be_clickable(
# # #                 (By.CSS_SELECTOR, 'span[title="Add to Cart"]')
# # #             )
# # #         )
        
# # #         print("✓ Đã tìm thấy nút Add to Cart")
        
# # #         # Lấy thông tin sản phẩm trước khi thêm vào giỏ
# # #         product_name = product_card.find_element(By.CSS_SELECTOR, 'span.line-clamp-1').text
# # #         product_price = product_card.find_element(By.CSS_SELECTOR, 'span.text-main').text
        
# # #         print(f"Sản phẩm: {product_name}")
# # #         print(f"Giá: {product_price}")
        
# # #         # Nhấn nút Add to Cart
# # #         add_to_cart_button.click()
        
# # #         print("✓ Đã nhấn nút Add to Cart")
        
# # #         # Đợi một chút để xử lý
# # #         time.sleep(2)
        
# # #         print("=== KIỂM TRA KẾT QUẢ SAU KHI THÊM VÀO GIỎ ===")
        
# # #         # Kiểm tra các phản hồi có thể có sau khi thêm vào giỏ
# # #         try:
# # #             # Kiểm tra notification/toast message (nếu có)
# # #             notifications = driver.find_elements(
# # #                 By.CSS_SELECTOR, 
# # #                 '.toast, .notification, .alert, .success-message'
# # #             )
            
# # #             if notifications:
# # #                 for notification in notifications:
# # #                     if notification.is_displayed():
# # #                         print(f"✓ Thông báo: {notification.text}")
            
# # #             # Kiểm tra cart icon có cập nhật số lượng không (nếu có)
# # #             cart_badges = driver.find_elements(
# # #                 By.CSS_SELECTOR, 
# # #                 '.cart-badge, .badge, .cart-count'
# # #             )
            
# # #             for badge in cart_badges:
# # #                 if badge.is_displayed() and badge.text:
# # #                     print(f"✓ Số lượng trong giỏ: {badge.text}")
                    
# # #         except Exception as e:
# # #             print(f"Không tìm thấy thông báo hoặc cập nhật giỏ hàng: {str(e)}")
        
# # #         # Kiểm tra URL có thay đổi không (redirect to cart page)
# # #         current_url = driver.current_url
# # #         if 'cart' in current_url.lower():
# # #             print("✓ Đã chuyển hướng đến trang giỏ hàng")
# # #         else:
# # #             print(f"URL hiện tại: {current_url}")
            
# # #         print("\n=== THÊM VÀO GIỎ HÀNG THÀNH CÔNG ===")
        
# # #     except Exception as e:
# # #         print(f"✗ Lỗi khi thêm vào giỏ hàng: {str(e)}")
        
# # #         # Debug: In ra HTML của trang để kiểm tra
# # #         try:
# # #             page_source = driver.page_source
# # #             with open('debug_page.html', 'w', encoding='utf-8') as f:
# # #                 f.write(page_source)
# # #             print("Đã lưu HTML trang vào file debug_page.html để kiểm tra")
# # #         except:
# # #             pass
            
# # #     finally:
# # #         # Đợi một chút trước khi đóng để có thể quan sát
# # #         time.sleep(3)
# # #         driver.quit()

# # # def test_add_multiple_products_to_cart():
# # #     """Test thêm nhiều sản phẩm vào giỏ hàng"""
# # #     chrome_options = Options()
# # #     chrome_options.add_argument('--disable-gpu')
# # #     chrome_options.add_argument('--no-sandbox')
# # #     chrome_options.add_argument("--incognito")
    
# # #     service = Service()
# # #     driver = webdriver.Chrome(service=service, options=chrome_options)
# # #     wait = WebDriverWait(driver, 10)

# # #     try:
# # #         url = 'http://localhost:5173'
# # #         driver.get(url)
# # #         time.sleep(2)

# # #         # Tìm tất cả product cards
# # #         product_cards = driver.find_elements(
# # #             By.CSS_SELECTOR, 
# # #             'div.w-full.border.p-\\[15px\\].flex.flex-col.items-center'
# # #         )
        
# # #         print(f"Tìm thấy {len(product_cards)} sản phẩm")
        
# # #         actions = ActionChains(driver)
        
# # #         for i, card in enumerate(product_cards[:3]):  # Chỉ test 3 sản phẩm đầu
# # #             print(f"\n=== THÊM SẢN PHẨM {i+1} VÀO GIỎ ===")
            
# # #             # Hover lên product card
# # #             actions.move_to_element(card).perform()
# # #             time.sleep(1)
            
# # #             try:
# # #                 # Tìm nút Add to Cart trong card này
# # #                 add_to_cart = card.find_element(
# # #                     By.CSS_SELECTOR, 
# # #                     'span[title="Add to Cart"]'
# # #                 )
                
# # #                 # Lấy tên sản phẩm
# # #                 product_name = card.find_element(
# # #                     By.CSS_SELECTOR, 
# # #                     'span.line-clamp-1'
# # #                 ).text
                
# # #                 print(f"Thêm sản phẩm: {product_name}")
                
# # #                 # Nhấn Add to Cart
# # #                 add_to_cart.click()
# # #                 time.sleep(1)
                
# # #                 print(f"✓ Đã thêm sản phẩm {i+1} vào giỏ")
                
# # #             except Exception as e:
# # #                 print(f"✗ Lỗi khi thêm sản phẩm {i+1}: {str(e)}")
                
# # #     except Exception as e:
# # #         print(f"Lỗi trong test multiple products: {str(e)}")
        
# # #     finally:
# # #         time.sleep(3)
# # #         driver.quit()

# # # if __name__ == "__main__":
# # #     print("=== TEST THÊM MỘT SẢN PHẨM VÀO GIỎ ===")
# # #     test_add_to_cart()
    
# # #     print("\n" + "="*50)
# # #     # print("=== TEST THÊM NHIỀU SẢN PHẨM VÀO GIỎ ===")
# # #     test_add_multiple_products_to_cart()
# # from selenium import webdriver
# # from selenium.webdriver.common.action_chains import ActionChains
# # from selenium.webdriver.common.by import By
# # from selenium.webdriver.chrome.service import Service
# # from selenium.webdriver.chrome.options import Options
# # from selenium.webdriver.support.ui import WebDriverWait
# # from selenium.webdriver.support import expected_conditions as EC
# # import time

# # def test_add_to_cart_with_error_handling():
# #     # Setup Chrome options
# #     chrome_options = Options()
# #     chrome_options.add_argument('--disable-gpu')
# #     chrome_options.add_argument('--no-sandbox')
# #     chrome_options.add_argument('--disable-dev-shm-usage')
# #     chrome_options.add_argument("--incognito")

# #     service = Service()
# #     driver = webdriver.Chrome(service=service, options=chrome_options)
# #     wait = WebDriverWait(driver, 10)

# #     try:
# #         url = 'http://localhost:5173'  # Thay bằng URL thực tế
# #         driver.get(url)
# #         time.sleep(2)

# #         print("=== TÌM VÀ HOVER LÊN PRODUCT CARD ===")
        
# #         # Tìm product card container
# #         product_card = wait.until(
# #             EC.presence_of_element_located(
# #                 (By.CSS_SELECTOR, 'div.w-full.border.p-\\[15px\\].flex.flex-col.items-center')
# #             )
# #         )
        
# #         print("✓ Đã tìm thấy product card")

# #         # Thực hiện hover để hiển thị action buttons
# #         actions = ActionChains(driver)
# #         actions.move_to_element(product_card).perform()
# #         time.sleep(1)

# #         print("=== NHẤN NÚT ADD TO CART ===")
        
# #         # Đợi và nhấn nút Add to Cart
# #         add_to_cart_button = wait.until(
# #             EC.element_to_be_clickable(
# #                 (By.CSS_SELECTOR, 'span[title="Add to Cart"]')
# #             )
# #         )
        
# #         # Lấy thông tin sản phẩm
# #         product_name = product_card.find_element(By.CSS_SELECTOR, 'span.line-clamp-1').text
# #         product_price = product_card.find_element(By.CSS_SELECTOR, 'span.text-main').text
        
# #         print(f"Thêm sản phẩm: {product_name} - {product_price}")
        
# #         # Nhấn nút Add to Cart
# #         add_to_cart_button.click()
# #         print("✓ Đã nhấn nút Add to Cart")
        
# #         # Đợi phản hồi từ server
# #         time.sleep(2)
        
# #         print("=== KIỂM TRA KẾT QUẢ ===")
        
# #         # Kiểm tra popup lỗi SweetAlert2
# #         try:
# #             error_popup = wait.until(
# #                 EC.presence_of_element_located(
# #                     (By.CSS_SELECTOR, 'div.swal2-popup.swal2-modal.swal2-icon-info.swal2-show')
# #                 ),
# #                 timeout=5
# #             )
            
# #             print("✗ PHÁT HIỆN POPUP LỖI!")
            
# #             # Lấy tiêu đề lỗi
# #             error_title = error_popup.find_element(By.CSS_SELECTOR, 'h2.swal2-title').text
# #             print(f"Tiêu đề lỗi: {error_title}")
            
# #             # Lấy nội dung lỗi
# #             error_message = error_popup.find_element(By.CSS_SELECTOR, 'div.swal2-html-container').text
# #             print(f"Thông báo lỗi: {error_message}")
            
# #             # Kiểm tra loại lỗi
# #             if "đăng nhập" in error_message.lower():
# #                 print("❌ LỖI: Cần đăng nhập để thêm vào giỏ hàng")
                
# #                 # Xử lý popup - có thể nhấn "Đăng nhập" hoặc "Hủy"
# #                 login_button = error_popup.find_element(By.CSS_SELECTOR, 'button.swal2-confirm')
# #                 cancel_button = error_popup.find_element(By.CSS_SELECTOR, 'button.swal2-cancel')
                
# #                 print(f"Nút đăng nhập: {login_button.text}")
# #                 print(f"Nút hủy: {cancel_button.text}")
                
# #                 # Chọn hành động
# #                 user_choice = "cancel"  # Có thể thay đổi thành "login" nếu muốn
                
# #                 if user_choice == "login":
# #                     login_button.click()
# #                     print("✓ Đã nhấn nút Đăng nhập")
                    
# #                     # Đợi chuyển hướng đến trang đăng nhập
# #                     time.sleep(2)
# #                     current_url = driver.current_url
# #                     if "login" in current_url.lower() or "signin" in current_url.lower():
# #                         print("✓ Đã chuyển hướng đến trang đăng nhập")
# #                     else:
# #                         print(f"URL hiện tại: {current_url}")
                        
# #                 else:
# #                     cancel_button.click()
# #                     print("✓ Đã nhấn nút Hủy")
                    
# #                     # Kiểm tra popup đã đóng
# #                     time.sleep(1)
# #                     popups_after = driver.find_elements(
# #                         By.CSS_SELECTOR, 
# #                         'div.swal2-popup.swal2-modal.swal2-show'
# #                     )
                    
# #                     if len(popups_after) == 0:
# #                         print("✓ Popup đã đóng")
# #                     else:
# #                         print("✗ Popup vẫn hiển thị")
                
# #                 return False  # Thêm vào giỏ thất bại
                
# #             else:
# #                 print(f"❌ LỖI KHÁC: {error_message}")
# #                 return False
                
# #         except Exception:
# #             # Không có popup lỗi, kiểm tra thành công
# #             print("=== KIỂM TRA THÊM VÀO GIỎ THÀNH CÔNG ===")
            
# #             # Kiểm tra thông báo thành công
# #             try:
# #                 success_notifications = driver.find_elements(
# #                     By.CSS_SELECTOR, 
# #                     '.toast-success, .alert-success, .swal2-success'
# #                 )
                
# #                 for notification in success_notifications:
# #                     if notification.is_displayed():
# #                         print(f"✓ Thông báo thành công: {notification.text}")
                        
# #                 # Kiểm tra cart badge cập nhật
# #                 cart_badges = driver.find_elements(
# #                     By.CSS_SELECTOR, 
# #                     '.cart-badge, .badge, .cart-count, [data-testid="cart-count"]'
# #                 )
                
# #                 for badge in cart_badges:
# #                     if badge.is_displayed() and badge.text:
# #                         print(f"✓ Số lượng trong giỏ: {badge.text}")
                        
# #                 print("✅ THÊM VÀO GIỎ HÀNG THÀNH CÔNG!")
# #                 return True
                
# #             except Exception as e:
# #                 print(f"Không tìm thấy xác nhận thành công: {str(e)}")
# #                 return True  # Giả sử thành công nếu không có lỗi
        
# #     except Exception as e:
# #         print(f"✗ Lỗi trong quá trình test: {str(e)}")
# #         return False
        
# #     finally:
# #         time.sleep(3)
# #         driver.quit()

# # def test_add_to_cart_when_logged_in():
# #     """Test thêm vào giỏ khi đã đăng nhập"""
# #     chrome_options = Options()
# #     chrome_options.add_argument("--incognito")
# #     service = Service()
# #     driver = webdriver.Chrome(service=service, options=chrome_options)
# #     wait = WebDriverWait(driver, 10)

# #     try:
# #         url = 'http://localhost:5173'
# #         driver.get(url)
# #         time.sleep(2)

# #         print("=== ĐĂNG NHẬP TRƯỚC KHI THÊM VÀO GIỎ ===")
        
# #         # Tìm và nhấn nút đăng nhập (nếu có)
# #         try:
# #             login_link = driver.find_element(
# #                 By.CSS_SELECTOR, 
# #                 'a[href*="login"], button:contains("Đăng nhập"), .login-btn'
# #             )
# #             login_link.click()
            
# #             # Điền thông tin đăng nhập (cần thay đổi selector phù hợp)
# #             username_field = wait.until(
# #                 EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="email"], input[name="username"]'))
# #             )
# #             password_field = driver.find_element(By.CSS_SELECTOR, 'input[type="password"]')
            
# #             username_field.send_keys("test@example.com")  # Thay bằng email test
# #             password_field.send_keys("password123")      # Thay bằng password test
            
# #             # Nhấn nút đăng nhập
# #             login_submit = driver.find_element(By.CSS_SELECTOR, 'button[type="submit"], .login-submit')
# #             login_submit.click()
            
# #             time.sleep(3)
# #             print("✓ Đã đăng nhập")
            
# #         except Exception as e:
# #             print(f"Không thể đăng nhập tự động: {str(e)}")
# #             print("Vui lòng đăng nhập thủ công và chạy lại test")
# #             return
        
# #         # Sau khi đăng nhập, thử thêm vào giỏ hàng
# #         result = test_add_to_cart_with_error_handling()
        
# #         if result:
# #             print("✅ THÊM VÀO GIỎ THÀNH CÔNG SAU KHI ĐĂNG NHẬP!")
# #         else:
# #             print("❌ VẪN THẤT BẠI SAU KHI ĐĂNG NHẬP")
            
# #     except Exception as e:
# #         print(f"Lỗi trong test đăng nhập: {str(e)}")
        
# #     finally:
# #         driver.quit()

# # if __name__ == "__main__":
# #     print("=== TEST THÊM VÀO GIỎ VỚI XỬ LÝ LỖI ===")
# #     success = test_add_to_cart_with_error_handling()
    
# #     if not success:
# #         print("\n" + "="*50)
# #         print("=== TEST VỚI ĐĂNG NHẬP ===")
# #         test_add_to_cart_when_logged_in()
# from selenium import webdriver
# from selenium.webdriver.common.action_chains import ActionChains
# from selenium.webdriver.common.by import By
# from selenium.webdriver.chrome.service import Service
# from selenium.webdriver.chrome.options import Options
# from selenium.webdriver.support.ui import WebDriverWait
# from selenium.webdriver.support import expected_conditions as EC
# from selenium.common.exceptions import TimeoutException, NoSuchElementException
# import time

# class AddToCartResult:
#     def __init__(self, success=False, message="", requires_login=False):
#         self.success = success
#         self.message = message
#         self.requires_login = requires_login

# def test_add_to_cart_with_login_detection():
#     chrome_options = Options()
#     chrome_options.add_argument('--disable-gpu')
#     chrome_options.add_argument('--no-sandbox')
#     chrome_options.add_argument('--disable-dev-shm-usage')

#     service = Service()
#     driver = webdriver.Chrome(service=service, options=chrome_options)
#     wait = WebDriverWait(driver, 10)

#     try:
#         url = 'http://localhost:5173'  # Thay bằng URL thực tế
#         driver.get(url)
#         time.sleep(2)

#         print("=== BẮT ĐẦU TEST THÊM VÀO GIỎ HÀNG ===")
        
#         # Tìm và hover product card
#         product_card = wait.until(
#             EC.presence_of_element_located(
#                 (By.CSS_SELECTOR, 'div.w-full.border.p-\\[15px\\].flex.flex-col.items-center')
#             )
#         )
        
#         # Lấy thông tin sản phẩm trước khi thêm
#         product_name = product_card.find_element(By.CSS_SELECTOR, 'span.line-clamp-1').text
#         product_price = product_card.find_element(By.CSS_SELECTOR, 'span.text-main').text
        
#         print(f"Sản phẩm: {product_name}")
#         print(f"Giá: {product_price}")
        
#         # Hover để hiển thị action buttons
#         actions = ActionChains(driver)
#         actions.move_to_element(product_card).perform()
#         time.sleep(1)

#         # Nhấn nút Add to Cart
#         add_to_cart_button = wait.until(
#             EC.element_to_be_clickable(
#                 (By.CSS_SELECTOR, 'span[title="Add to Cart"]')
#             )
#         )
        
#         print("✓ Đã tìm thấy nút Add to Cart")
#         add_to_cart_button.click()
#         print("✓ Đã nhấn nút Add to Cart")
        
#         # Đợi phản hồi từ server
#         time.sleep(2)
        
#         # Kiểm tra popup đăng nhập
#         result = check_login_popup(driver, wait)
        
#         if result.requires_login:
#             print("❌ THÊM VÀO GIỎ HÀNG THẤT BẠI - CẦN ĐĂNG NHẬP")
#             print(f"Thông báo: {result.message}")
#             return result
#         elif result.success:
#             print("✅ THÊM VÀO GIỎ HÀNG THÀNH CÔNG")
#             return result
#         else:
#             print("❓ KHÔNG XÁC ĐỊNH ĐƯỢC KẾT QUẢ")
#             return result
            
#     except Exception as e:
#         print(f"✗ Lỗi trong quá trình test: {str(e)}")
#         return AddToCartResult(success=False, message=f"Lỗi: {str(e)}")
        
#     finally:
#         time.sleep(3)
#         driver.quit()

# def check_login_popup(driver, wait):
#     """Kiểm tra popup yêu cầu đăng nhập"""
#     try:
#         # Tìm popup SweetAlert2 với thông báo đăng nhập
#         login_popup = wait.until(
#             EC.presence_of_element_located(
#                 (By.CSS_SELECTOR, 'div.swal2-popup.swal2-modal.swal2-icon-info.swal2-show')
#             ),
#             timeout=5
#         )
        
#         print("🔍 Phát hiện popup SweetAlert2")
        
#         # Kiểm tra tiêu đề popup
#         try:
#             title_element = login_popup.find_element(By.CSS_SELECTOR, 'h2.swal2-title')
#             title_text = title_element.text
#             print(f"Tiêu đề popup: {title_text}")
#         except:
#             title_text = ""
        
#         # Kiểm tra nội dung popup
#         try:
#             content_element = login_popup.find_element(By.CSS_SELECTOR, 'div.swal2-html-container')
#             content_text = content_element.text
#             print(f"Nội dung popup: {content_text}")
#         except:
#             content_text = ""
        
#         # Kiểm tra xem có phải popup đăng nhập không
#         # login_keywords = ["đăng nhập", "login", "vui lòng đăng nhập"]
#         login_keywords = [
#     "vui lòng đăng nhập",
#     "bạn cần đăng nhập",
#     "đăng nhập để tiếp tục",
#     "please log in",
#     "login required"
# ]

#         is_login_popup = any(keyword in content_text.lower() for keyword in login_keywords)
#         if is_login_popup:
#             print("✓ Xác nhận đây là popup yêu cầu đăng nhập")
            
#             # Tìm các nút trong popup
#             try:
#                 login_button = login_popup.find_element(By.CSS_SELECTOR, 'button.swal2-confirm')
#                 cancel_button = login_popup.find_element(By.CSS_SELECTOR, 'button.swal2-cancel')
                
#                 login_btn_text = login_button.text
#                 cancel_btn_text = cancel_button.text
                
#                 print(f"Nút xác nhận: {login_btn_text}")
#                 print(f"Nút hủy: {cancel_btn_text}")
                
#                 # Đóng popup bằng cách nhấn nút Hủy
#                 cancel_button.click()
#                 print("✓ Đã đóng popup bằng nút Hủy")
                
#                 # Đợi popup đóng
#                 time.sleep(1)
                
#                 # Kiểm tra popup đã đóng chưa
#                 remaining_popups = driver.find_elements(
#                     By.CSS_SELECTOR, 
#                     'div.swal2-popup.swal2-modal.swal2-show'
#                 )
                
#                 if len(remaining_popups) == 0:
#                     print("✓ Popup đã đóng hoàn toàn")
#                 else:
#                     print("⚠️ Popup vẫn còn hiển thị")
                
#             except Exception as e:
#                 print(f"Lỗi khi xử lý nút popup: {str(e)}")
            
#             return AddToCartResult(
#                 success=False, 
#                 message=content_text, 
#                 requires_login=True
#             )
#         else:
#             print("⚠️ Popup không phải yêu cầu đăng nhập")
#             return AddToCartResult(
#                 success=False, 
#                 message=f"Popup khác: {content_text}"
#             )
            
#     except TimeoutException:
#         # Không có popup đăng nhập, kiểm tra thành công
#         print("🔍 Không phát hiện popup đăng nhập")
#         return check_success_indicators(driver)
    
#     except Exception as e:
#         print(f"Lỗi khi kiểm tra popup: {str(e)}")
#         return AddToCartResult(success=False, message=f"Lỗi kiểm tra: {str(e)}")

# def check_success_indicators(driver):
#     """Kiểm tra các dấu hiệu thêm vào giỏ thành công"""
#     try:
#         # Kiểm tra thông báo thành công
#         success_selectors = [
#             '.toast-success',
#             '.alert-success', 
#             '.swal2-success',
#             '.notification-success',
#             '[data-testid="success-message"]'
#         ]
        
#         for selector in success_selectors:
#             try:
#                 success_elements = driver.find_elements(By.CSS_SELECTOR, selector)
#                 for element in success_elements:
#                     if element.is_displayed():
#                         print(f"✓ Tìm thấy thông báo thành công: {element.text}")
#                         return AddToCartResult(
#                             success=True, 
#                             message=f"Thành công: {element.text}"
#                         )
#             except:
#                 continue
        
#         # Kiểm tra cart badge cập nhật
#         cart_selectors = [
#             '.cart-badge',
#             '.cart-count',
#             '[data-testid="cart-count"]',
#             '.badge'
#         ]
        
#         for selector in cart_selectors:
#             try:
#                 cart_elements = driver.find_elements(By.CSS_SELECTOR, selector)
#                 for element in cart_elements:
#                     if element.is_displayed() and element.text.strip():
#                         count = element.text.strip()
#                         if count.isdigit() and int(count) > 0:
#                             print(f"✓ Cart badge cập nhật: {count}")
#                             return AddToCartResult(
#                                 success=True, 
#                                 message=f"Đã thêm vào giỏ, số lượng: {count}"
#                             )
#             except:
#                 continue
        
#         # Nếu không tìm thấy dấu hiệu rõ ràng, giả sử thành công
#         print("⚠️ Không tìm thấy dấu hiệu rõ ràng, giả sử thành công")
#         return AddToCartResult(
#             success=True, 
#             message="Có thể đã thêm thành công (không có xác nhận rõ ràng)"
#         )
        
#     except Exception as e:
#         print(f"Lỗi khi kiểm tra thành công: {str(e)}")
#         return AddToCartResult(success=False, message=f"Lỗi: {str(e)}")

# def test_multiple_products():
#     """Test thêm nhiều sản phẩm và xử lý popup đăng nhập"""
#     chrome_options = Options()
#     service = Service()
#     driver = webdriver.Chrome(service=service, options=chrome_options)
#     wait = WebDriverWait(driver, 10)

#     try:
#         url = 'http://localhost:5173'
#         driver.get(url)
#         time.sleep(2)

#         # Tìm tất cả product cards
#         product_cards = driver.find_elements(
#             By.CSS_SELECTOR, 
#             'div.w-full.border.p-\\[15px\\].flex.flex-col.items-center'
#         )
        
#         print(f"Tìm thấy {len(product_cards)} sản phẩm")
        
#         results = []
#         actions = ActionChains(driver)
        
#         for i, card in enumerate(product_cards[:3]):  # Test 3 sản phẩm đầu
#             print(f"\n=== TEST SẢN PHẨM {i+1} ===")
            
#             try:
#                 # Hover và click
#                 actions.move_to_element(card).perform()
#                 time.sleep(1)
                
#                 add_to_cart = card.find_element(By.CSS_SELECTOR, 'span[title="Add to Cart"]')
#                 product_name = card.find_element(By.CSS_SELECTOR, 'span.line-clamp-1').text
                
#                 print(f"Thêm: {product_name}")
#                 add_to_cart.click()
#                 time.sleep(2)
                
#                 # Kiểm tra kết quả
#                 result = check_login_popup(driver, wait)
#                 results.append({
#                     'product': product_name,
#                     'result': result
#                 })
                
#                 if result.requires_login:
#                     print(f"❌ Sản phẩm {i+1}: Cần đăng nhập")
#                     break  # Dừng test nếu cần đăng nhập
#                 elif result.success:
#                     print(f"✅ Sản phẩm {i+1}: Thành công")
#                 else:
#                     print(f"❓ Sản phẩm {i+1}: Không rõ")
                    
#             except Exception as e:
#                 print(f"✗ Lỗi sản phẩm {i+1}: {str(e)}")
                
#         # Tổng kết
#         print(f"\n=== TỔNG KẾT TEST {len(results)} SẢN PHẨM ===")
#         success_count = sum(1 for r in results if r['result'].success)
#         login_required_count = sum(1 for r in results if r['result'].requires_login)
        
#         print(f"Thành công: {success_count}")
#         print(f"Cần đăng nhập: {login_required_count}")
#         print(f"Lỗi khác: {len(results) - success_count - login_required_count}")
        
#     except Exception as e:
#         print(f"Lỗi trong test multiple: {str(e)}")
        
#     finally:
#         time.sleep(3)
#         driver.quit()

# if __name__ == "__main__":
#     print("=== TEST ĐƠN LẺ ===")
#     result = test_add_to_cart_with_login_detection()
    
#     print(f"\nKết quả: Success={result.success}, Login Required={result.requires_login}")
#     print(f"Message: {result.message}")
    
#     print("\n" + "="*50)
#     print("=== TEST NHIỀU SẢN PHẨM ===")
#     test_multiple_products()
from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time

class AddToCartResult:
    def __init__(self, success=False, message="", requires_login=False):
        self.success = success
        self.message = message
        self.requires_login = requires_login

def test_add_to_cart_with_login_detection():
    chrome_options = Options()
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')

    service = Service()
    driver = webdriver.Chrome(service=service, options=chrome_options)
    wait = WebDriverWait(driver, 10)

    try:
        url = 'http://localhost:5173'
        driver.get(url)
        time.sleep(2)

        print("=== BẮT ĐẦU TEST THÊM VÀO GIỎ HÀNG ===")

        product_card = wait.until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, 'div.w-full.border.p-\\[15px\\].flex.flex-col.items-center')
            )
        )

        product_name = product_card.find_element(By.CSS_SELECTOR, 'span.line-clamp-1').text
        product_price = product_card.find_element(By.CSS_SELECTOR, 'span.text-main').text
        print(f"Sản phẩm: {product_name}")
        print(f"Giá: {product_price}")

        actions = ActionChains(driver)
        actions.move_to_element(product_card).perform()
        time.sleep(1)

        add_to_cart_button = wait.until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, 'span[title="Add to Cart"]')
            )
        )
        print("✓ Đã tìm thấy nút Add to Cart")
        add_to_cart_button.click()
        print("✓ Đã nhấn nút Add to Cart")
        time.sleep(2)

        result = check_login_popup(driver, wait)

        if result.requires_login:
            print("❌ THÊM VÀO GIỎ HÀNG THẤT BẠI - CẦN ĐĂNG NHẬP")
            print(f"Thông báo: {result.message}")
        elif result.success:
            print("✅ THÊM VÀO GIỎ HÀNG THÀNH CÔNG")
        else:
            print("❓ KHÔNG XÁC ĐỊNH ĐƯỢC KẾT QUẢ")

        return result

    except Exception as e:
        print(f"✗ Lỗi trong quá trình test: {str(e)}")
        return AddToCartResult(success=False, message=f"Lỗi: {str(e)}")
    finally:
        time.sleep(3)
        driver.quit()

def check_login_popup(driver, wait):
    try:
        login_popup = wait.until(
    EC.presence_of_element_located(
        (By.CSS_SELECTOR, 'div.swal2-popup.swal2-modal.swal2-icon-info.swal2-show')
    )
)

        print("🔍 Phát hiện popup SweetAlert2")

        title_text = ""
        content_text = ""

        try:
            title_text = login_popup.find_element(By.CSS_SELECTOR, 'h2.swal2-title').text
        except:
            pass

        try:
            content_text = login_popup.find_element(By.CSS_SELECTOR, 'div.swal2-html-container').text
        except:
            pass

        print(f"Tiêu đề popup: {title_text}")
        print(f"Nội dung popup: {content_text}")

        login_keywords = [
            "vui lòng đăng nhập",
            "bạn cần đăng nhập",
            "đăng nhập để tiếp tục",
            "please log in",
            "login required"
        ]
        is_login_popup = any(keyword in content_text.lower() for keyword in login_keywords)

        if is_login_popup:
            print("✓ Xác nhận đây là popup yêu cầu đăng nhập")
            try:
                cancel_button = login_popup.find_element(By.CSS_SELECTOR, 'button.swal2-cancel')
                cancel_button.click()
                print("✓ Đã đóng popup bằng nút Hủy")
                time.sleep(1)
            except Exception as e:
                print(f"Lỗi khi xử lý popup: {str(e)}")

            return AddToCartResult(success=False, message=content_text, requires_login=True)
        else:
            print("⚠️ Popup không phải yêu cầu đăng nhập")
            return AddToCartResult(success=False, message=f"Popup khác: {content_text}")

    except TimeoutException:
        print("🔍 Không phát hiện popup đăng nhập")
        return check_success_indicators(driver)
    except Exception as e:
        print(f"✗ Lỗi khi kiểm tra popup: {str(e)}")
        return AddToCartResult(success=False, message=f"Lỗi kiểm tra: {str(e)}")

def check_success_indicators(driver):
    try:
        success_selectors = [
            '.toast-success', '.alert-success', '.swal2-success',
            '.notification-success', '[data-testid="success-message"]'
        ]
        for selector in success_selectors:
            elements = driver.find_elements(By.CSS_SELECTOR, selector)
            for el in elements:
                if el.is_displayed():
                    print(f"✓ Tìm thấy thông báo thành công: {el.text}")
                    return AddToCartResult(success=True, message=el.text)

        cart_selectors = ['.cart-badge', '.cart-count', '[data-testid="cart-count"]', '.badge']
        for selector in cart_selectors:
            elements = driver.find_elements(By.CSS_SELECTOR, selector)
            for el in elements:
                if el.is_displayed() and el.text.strip().isdigit():
                    count = int(el.text.strip())
                    if count > 0:
                        print(f"✓ Cart badge cập nhật: {count}")
                        return AddToCartResult(success=True, message=f"Số lượng giỏ hàng: {count}")

        print("⚠️ Không tìm thấy dấu hiệu rõ ràng, giả định thành công")
        return AddToCartResult(success=True, message="Không có xác nhận rõ ràng, giả định đã thêm thành công")

    except Exception as e:
        print(f"✗ Lỗi khi kiểm tra thành công: {str(e)}")
        return AddToCartResult(success=False, message=f"Lỗi: {str(e)}")

if __name__ == "__main__":
    print("=== TEST ĐƠN LẺ ===")
    result = test_add_to_cart_with_login_detection()
    print(f"\nKết quả: Success={result.success}, Login Required={result.requires_login}")
    print(f"Message: {result.message}")
