import json
import os
import uuid
from typing import List, Optional
from datetime import datetime
from .models import VocabularyEntry

STORAGE_FILE = "vocabulary_data.json"

class VocabularyStorage:
    def __init__(self, file_path: str = STORAGE_FILE):
        self.file_path = file_path
        self.ensure_file_exists()
    
    def ensure_file_exists(self):
        """저장 파일이 없으면 생성"""
        if not os.path.exists(self.file_path):
            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump([], f, ensure_ascii=False)
    
    def load_all(self) -> List[VocabularyEntry]:
        """모든 어휘 데이터 로드"""
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return [VocabularyEntry(**item) for item in data]
        except Exception:
            return []
    
    def save(self, entry: VocabularyEntry) -> VocabularyEntry:
        """새 어휘 항목 저장"""
        # ID와 생성시간 설정
        if not entry.id:
            entry.id = str(uuid.uuid4())
        if not entry.created_at:
            entry.created_at = datetime.now()
        
        # 기존 데이터 로드
        all_entries = self.load_all()
        
        # 중복 확인 (같은 단어가 있으면 업데이트)
        existing_index = -1
        for i, existing_entry in enumerate(all_entries):
            if existing_entry.original_word == entry.original_word:
                existing_index = i
                break
        
        if existing_index >= 0:
            all_entries[existing_index] = entry
        else:
            all_entries.append(entry)
        
        # 파일에 저장
        with open(self.file_path, 'w', encoding='utf-8') as f:
            json.dump(
                [entry.dict() for entry in all_entries], 
                f, 
                ensure_ascii=False, 
                indent=2,
                default=str
            )
        
        return entry
    
    def get_by_word(self, word: str) -> Optional[VocabularyEntry]:
        """특정 단어로 검색"""
        all_entries = self.load_all()
        for entry in all_entries:
            if entry.original_word == word:
                return entry
        return None
    
    def delete(self, word: str) -> bool:
        """어휘 항목 삭제"""
        all_entries = self.load_all()
        original_count = len(all_entries)
        
        all_entries = [entry for entry in all_entries if entry.original_word != word]
        
        if len(all_entries) < original_count:
            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump(
                    [entry.dict() for entry in all_entries], 
                    f, 
                    ensure_ascii=False, 
                    indent=2,
                    default=str
                )
            return True
        return False

# 전역 스토리지 인스턴스
storage = VocabularyStorage()