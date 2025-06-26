from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.action_chains import ActionChains
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
import time
import random


chrome_options = Options()
chrome_options.add_argument("--incognito")

# Cài đặt Service cho ChromeDriver
service = Service(ChromeDriverManager().install())

# Khởi tạo trình duyệt với cấu hình và Service đã tạo
driver = webdriver.Chrome(service=service, options=chrome_options)

driver.get('http://localhost:5173/')

# driver.maximize_window()?-

# Đợi trang tải xong
time.sleep(3)

login_link = driver.find_element(By.XPATH, "//a[@href='/login' and contains(text(), 'Đăng nhập hoặc đăng ký')]")
login_link.click()
time.sleep(2)

username_field = driver.find_element(By.NAME, "email")  # Thay "username" bằng name thực tế của trường input
password_field = driver.find_element(By.NAME, "password")  # Thay "password" bằng name thực tế của trường input

username_field.send_keys('huygiavu2003@gmail.com')  # Thay bằng username thực tế
password_field.send_keys('12345678')

time.sleep(2)
# Tìm nút đăng nhập và click vào
login_button = driver.find_element(By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Đăng nhập')]")
login_button.click()
# driver.execute_script("window.scrollBy(0, 1000);")  # Kéo xuống 1000px
# Đợi một chút để giỏ hàng cập nhật
time.sleep(5)
# Tìm tất cả các sản phẩm
# products = driver.find_elements(By.CSS_SELECTOR, ".w-full.border.p-[15px] .aspect-w-1.aspect-h-1 img")

# Lấy tất cả các sản phẩm (Sửa lại selector sử dụng XPath)
# products = driver.find_elements(By.XPATH, "//div[contains(@class, 'w-full border p-[15px]')]//img")
products = driver.find_elements(By.XPATH, "//div[contains(@class, 'w-full border p-[15px] flex flex-col items-center')]//img")
# Lấy tên sản phẩm
# product_name = driver.find_element(By.CSS_SELECTOR, ".w-full.border.p-[15px] .line-clamp-1").text
# print("Tên sản phẩm:", product_name)

# Lấy tên sản phẩm
# product_name = driver.find_element(By.CSS_SELECTOR, ".w-full.border.p-[15px] .line-clamp-1").text
# print("Tên sản phẩm:", product_name)

# Lấy giá sản phẩm
# product_price = driver.find_element(By.CSS_SELECTOR, ".w-full.border.p-[15px] .text-main").text
# print("Giá sản phẩm:", product_price)

# Kiểm tra nếu có sản phẩm
# if len(products) > 0:
#     first_product = products[0]  # Chọn sản phẩm đầu tiên
#     actions = ActionChains(driver)
#     actions.move_to_element(first_product).click().perform()
time.sleep(5)
# Tìm tất cả các sản phẩm
# products = driver.find_elements(By.CSS_SELECTOR, ".w-full.border.p-[15px] .aspect-w-1.aspect-h-1 img")

# Lặp qua tất cả các sản phẩm và lấy thông tin
# product_info = []

# for product in products:
#     product_name = product.find_element(By.XPATH, "../../../../..//span[contains(@class, 'line-clamp-1')]").text
#     product_price = product.find_element(By.XPATH, "../../../../..//span[contains(@class, 'text-main')]").text
#     product_image = product.get_attribute("src")
    
#     product_info.append({
#         'name': product_name,
#         'price': product_price,
#         'image': product_image
#     })

# # In thông tin các sản phẩm
# for info in product_info:
#     print(f"Tên sản phẩm: {info['name']}")
#     print(f"Giá sản phẩm: {info['price']}")
#     print(f"Hình ảnh sản phẩm: {info['image']}")
#     print("-" * 50)
# Lấy tất cả các sản phẩm (Sửa lại selector sử dụng XPath)
products = driver.find_elements(By.XPATH, "//div[contains(@class, 'w-full border p-[15px]')]//img")

# Kiểm tra nếu có sản phẩm
if len(products) > 0:
    for product in products:
        # Lấy tên sản phẩm đúng
        product_name = product.find_element(By.XPATH, "../../../../..//span[contains(@class, 'line-clamp-1')]").text
        print("Tên sản phẩm:", product_name)

        # Lấy giá sản phẩm
        product_price = product.find_element(By.XPATH, "../../../../..//span[contains(@class, 'text-main')]").text
        print("Giá sản phẩm:", product_price)

        # Lấy ảnh sản phẩm
        product_image = product.get_attribute("src")
        print("Hình ảnh sản phẩm:", product_image)
        print("-" * 50)

# Đóng trình duyệt
time.sleep(5)

driver.quit()


