// src/components/NaverShopping.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "../style/NaverShopping.css";

const NaverShopping = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { key } = useParams();
  const BACKEND_URL = "https://flowerserver-j7p8.onrender.com";

  useEffect(() => {
    if (!key) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get(`${BACKEND_URL}/naver-shopping`, {
          params: { flowername: key },
        });

        setItems(res.data.items || []);
      } catch (err) {
        console.error("NaverShopping fetch error:", err);
        setError("네이버 쇼핑 데이터를 가져오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [key]);

  if (loading) return <p style={{ textAlign: "center", marginTop: "2rem" }}>네이버 쇼핑에서 상품을 불러오는 중입니다...</p>;
  if (error) return <p style={{ textAlign: "center", marginTop: "2rem", color: "red" }}>{error}</p>;
  if (items.length === 0) return <p style={{ textAlign: "center", marginTop: "2rem" }}>'{key}'에 대한 검색 결과가 없습니다.</p>;

  return (
    <div className="Navershopping">
      <h2 style={{ textAlign: "center", margin: "2rem 0" }}>네이버 쇼핑 결과: {key}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', padding: '0 20px' }}>
        {items.map((item, index) => (
          <div key={index} style={{ border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <a href={item.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
              <img src={item.image} alt={item.title} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
              <div style={{ padding: '15px' }}>
                <p style={{ fontWeight: 'bold', fontSize: '1.1rem', margin: '0 0 10px 0', height: '3em', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: item.title }}></p>
                <p style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '1.2rem', margin: '5px 0' }}>{item.lprice}원</p>
                <p style={{ fontSize: '0.85rem', color: '#7f8c8d', margin: '0' }}>{item.mallName}</p>
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NaverShopping;