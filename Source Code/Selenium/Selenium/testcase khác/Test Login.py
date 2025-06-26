from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.action_chains import ActionChains
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
import time
import random
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
chrome_options = Options()
chrome_options.add_argument("--incognito")

# Cài đặt Service cho ChromeDriver
service = Service(ChromeDriverManager().install())

# Khởi tạo trình duyệt với cấu hình và Service đã tạo
driver = webdriver.Chrome(service=service, options=chrome_options)

driver.get('http://localhost:5173/')

# Đợi trang tải xong
time.sleep(1)

login_link = driver.find_element(By.XPATH, "//a[@href='/login' and contains(text(), 'Đăng nhập hoặc đăng ký')]")
login_link.click()
time.sleep(2)

username_field = driver.find_element(By.NAME, "email")  # Thay "username" bằng name thực tế của trường input
password_field = driver.find_element(By.NAME, "password")  # Thay "password" bằng name thực tế của trường input

username_field.send_keys('user@gmail.com')  # Thay bằng username thực tế
password_field.send_keys('12345678')

time.sleep(2)
# Tìm nút đăng nhập và click vào
login_button = driver.find_element(By.XPATH, "//button[contains(@class, 'bg-main') and contains(text(), 'Đăng nhập')]")
login_button.click()

# Đợi một chút để giỏ hàng cập nhật
time.sleep(5)
driver.quit()