import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useSearchParams } from 'react-router-dom';

export const AdminDashboard: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'allocate';

    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.getRooms(1, 10);
            if (res && res.data) setRooms(res.data);
        } catch (err) {
            console.error("Data fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
            <h1>Hostel Management</h1>
            
            <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                <button onClick={() => setSearchParams({ tab: 'allocate' })}>Allocation</button>
                <button onClick={() => setSearchParams({ tab: 'rooms' })}>Rooms</button>
            </div>

            {loading ? <p>Loading...</p> : (
                <div style={{ background: '#f4f4f4', padding: '20px', borderRadius: '8px' }}>
                    {rooms.length === 0 ? (
                        <p>No room data available.</p>
                    ) : (
                        <table style={{ width: '100%', textAlign: 'left' }}>
                            <thead>
                                <tr>
                                    <th>Room No</th>
                                    <th>Block</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rooms.map((room: any, i: number) => (
                                    <tr key={i}>
                                        <td>{room.roomNumber}</td>
                                        <td>{room.hostelBlock}</td>
                                        <td>{room.occupiedBeds} / {room.capacity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};