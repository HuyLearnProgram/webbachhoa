package com.app.webnongsan.repository;

import com.app.webnongsan.domain.VoucherGrantLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VoucherGrantLogRepository extends JpaRepository<VoucherGrantLog, Long> {
}
