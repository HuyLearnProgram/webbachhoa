import datetime
import sys
from io import StringIO

def save_test_log(message):
    """
    Ghi log message với timestamp vào file log.txt
    Tạo file mới nếu chưa tồn tại, hoặc ghi thêm nếu đã có
    """
    timestamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_entry = f"[{timestamp}] {message}\n"
    
    try:
        with open('log.txt', 'a', encoding='utf-8') as f:
            f.write(log_entry)
    except Exception as e:
        print(f"Lỗi khi ghi log: {e}")

class LogCapture:
    """
    Class để capture và ghi log tất cả các print statements
    """
    def __init__(self):
        self.original_stdout = sys.stdout
        self.log_buffer = StringIO()
        
    def start_capture(self):
        """Bắt đầu capture print statements"""
        sys.stdout = self
        
    def stop_capture(self):
        """Dừng capture và trả về stdout ban đầu"""
        sys.stdout = self.original_stdout
        
    def write(self, text):
        """Override write method để capture và log"""
        # Ghi ra console như bình thường
        self.original_stdout.write(text)
        self.original_stdout.flush()
        
        # Ghi vào log file nếu không phải là newline trống
        if text.strip():
            save_test_log(text.strip())
            
    def flush(self):
        """Override flush method"""
        self.original_stdout.flush()

def log_test_execution(test_function):
    """
    Decorator để tự động log toàn bộ quá trình thực thi test
    """
    def wrapper(*args, **kwargs):
        log_capture = LogCapture()
        
        # Ghi log bắt đầu test
        save_test_log(f"=== BẮT ĐẦU TEST:  ===")
        
        try:
            # Bắt đầu capture print statements
            log_capture.start_capture()
            
            # Thực thi test function
            result = test_function(*args, **kwargs)
            
            # Ghi log kết quả
            if result:
                save_test_log("=== TEST THÀNH CÔNG ===")
            else:
                save_test_log("=== TEST THẤT BẠI ===")
                
            return result
            
        except Exception as e:
            save_test_log(f"=== LỖI TRONG TEST: {str(e)} ===")
            raise
        finally:
            # Dừng capture
            log_capture.stop_capture()
            # save_test_log(f"=== KẾT THÚC TEST: {test_function.__name__} ===\n")
            save_test_log(f"=== KẾT THÚC TEST: ===\n")
            
    return wrapper

# Hàm tiện ích để ghi log với các mức độ khác nhau
def log_info(message):
    """Ghi log thông tin"""
    save_test_log(f"[INFO] {message}")

def log_error(message):
    """Ghi log lỗi"""
    save_test_log(f"[ERROR] {message}")

def log_warning(message):
    """Ghi log cảnh báo"""
    save_test_log(f"[WARNING] {message}")

def log_success(message):
    """Ghi log thành công"""
    save_test_log(f"[SUCCESS] {message}")
