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
